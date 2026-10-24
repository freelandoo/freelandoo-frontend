// Predição do jetpack em grupo (mm3d-21).
//
// O cliente roda a MESMA partida (sim/match.ts) `lead` passos à frente do
// servidor: o próprio jogador com o botão de verdade (marcado com o passo, a
// entrada vale lá exatamente onde valeu aqui) e os outros com o último botão
// que o servidor contou deles (fantasmas). A cada estado do servidor (passo
// S), volta todos a S com os valores dele, acerta o percurso (cápsulas pegas,
// peças quebradas, turbos pegos) e re-simula até o passo local, sem efeitos.
//
// Sem interferência dos outros, o próprio jogador já estava certo e nada muda
// (a sim é determinística). Quando muda (cápsula "roubada", entrada que chegou
// tarde), a diferença na tela some em ~100 ms (errX/errY). Fantasma não vai
// além de 300 ms depois do último estado. Morte prevista é só desenho: "saiu"
// vale com o estado 4 do servidor (outConfirmed).
//
// Só TypeScript que pode ser apagado: o teste do backend carrega este arquivo
// direto (test/unit/meuMundoJetpackClient.test.js).

import { Match, type MatchEvent } from '../sim/match';
import type { RunnerSnap, State } from '../sim/runner';
import { difficultyAt } from '../sim/difficulty';
import { TUNING, type Tuning } from '../sim/tuning';
import type { PartyRunnerState, PartyState } from './party-net';

/** Código do estado no servidor (STATE_CODE) → estado da sim. */
const STATES: State[] = ['ready', 'flying', 'falling', 'out_of_fuel', 'dead'];
const RING = 180;
/** Fantasma: no máximo 36 passos (300 ms) além do último estado do servidor. */
const GHOST_MAX = 36;
/** Erro visual: some em ~100 ms. */
const ERR_TAU_MS = 33;
/** Diferença acima disto não é suavizada (pula direto). */
const ERR_SNAP = 2;
/** Passos re-simulados ou avançados por chamada (aba que voltou do segundo plano). */
const MAX_STEPS = 600;

export interface PartySimOptions {
  tune?: Tuning;
  /** Manda a mudança do botão (passo local, segurando). */
  send?: (k: number, held: boolean) => void;
  /** Só teste: botão real dos outros (sem isso, o último que o servidor contou). */
  ghostHeld?: (slot: number, tick: number) => boolean;
}

interface Frame {
  tick: number;
  snaps: (RunnerSnap | null)[];
}

/** Valores do servidor → estado completo do jogador no passo `tick`. */
export function serverSnap(r: PartyRunnerState, tick: number, tune: Tuning = TUNING): RunnerSnap {
  const t = tick * tune.step;
  return {
    x: r.x,
    y: r.y,
    vy: r.vy,
    speed: difficultyAt(r.x).speed * (t < r.pw ? tune.powerSpeed : 1),
    state: STATES[r.st] ?? 'dead',
    thrusting: r.thr,
    fuel: r.fuel,
    powerUntil: r.pw,
    powered: r.pf,
    towed: r.tow,
    graceUntil: r.grace,
    passedId: r.pid,
    passed: r.pass,
    phase: r.ph,
    fuelCollected: r.fc,
    pickupsTaken: r.got,
    smashed: r.sm,
    deathTick: r.dieAt,
  };
}

export class PartySim {
  readonly match: Match;
  readonly me: number;
  readonly tune: Tuning;
  /** Vezes em que o próprio jogador previsto não bateu com o servidor. */
  corrections = 0;
  /** Passo do último estado do servidor aplicado. */
  serverTick = 0;
  /** O servidor confirmou a morte deste jogador. */
  outConfirmed = false;
  /** Diferença visual (m) a somar na posição desenhada; some sozinha (decay). */
  errX = 0;
  errY = 0;
  private readonly ring: (Frame | null)[] = new Array(RING).fill(null);
  private changes: { k: number; h: boolean }[] = [];
  private held = false;
  private readonly ghost = [false, false, false, false];
  private readonly heldBuf = [false, false, false, false];
  private readonly opts: PartySimOptions;

  constructor(seed: number, slots: number[], me: number, opts: PartySimOptions = {}) {
    this.opts = opts;
    this.tune = opts.tune ?? TUNING;
    this.me = me;
    this.match = new Match(seed, slots, this.tune);
    this.match.start();
    this.record();
  }

  get tick() {
    return this.match.ticks;
  }

  get runner() {
    return this.match.runners[this.me];
  }

  /** Botão do próprio jogador no passo k. */
  heldAt(k: number) {
    for (let i = this.changes.length - 1; i >= 0; i--) if (this.changes[i].k <= k) return this.changes[i].h;
    return false;
  }

  /** Contagem: o botão da largada (vale no passo 1 lá e aqui). */
  prime(held: boolean) {
    if (this.match.ticks > 0 || held === this.held) return;
    this.held = held;
    this.changes = [{ k: 1, h: held }];
    this.opts.send?.(1, held);
  }

  /** Avança o laço local até o passo `target` com o botão `held`. Devolve os eventos (efeitos e som). */
  advance(target: number, held: boolean): MatchEvent[] {
    const m = this.match;
    let n = 0;
    while (m.ticks < target && m.aliveCount() > 0 && n++ < MAX_STEPS) {
      const k = m.ticks + 1;
      if (held !== this.held) {
        this.held = held;
        this.changes.push({ k, h: held });
        this.opts.send?.(k, held);
      }
      this.stepOnce(k);
    }
    return m.drain();
  }

  /** Estado novo do servidor: volta a ele e re-simula até o passo local. */
  reconcile(st: PartyState) {
    const S = st.tick;
    if (S < this.serverTick) return;
    this.serverTick = S;
    const m = this.match;
    const L = m.ticks;
    let mine: PartyRunnerState | null = null;
    for (const r of st.runners.values()) {
      if (!r.inMatch || !m.runners[r.slot]) continue;
      if (r.slot === this.me) mine = r;
      else this.ghost[r.slot] = r.online && r.held;
    }
    if (mine && mine.st === 4) this.outConfirmed = true;
    const pred = this.frameAt(S)?.snaps[this.me];
    if (mine && pred) {
      const srv = serverSnap(mine, S, this.tune);
      if (Math.abs(pred.y - srv.y) > 0.01 || Math.abs(pred.fuel - srv.fuel) > 0.5 || pred.state !== srv.state) this.corrections++;
    }
    const me = this.runner;
    const bx = me ? me.x : 0;
    const by = me ? me.y : 0;

    this.syncTrack(st);
    for (const r of st.runners.values()) {
      const run = r.inMatch ? m.runners[r.slot] : null;
      if (run) run.restore(serverSnap(r, S, this.tune));
    }
    m.ticks = S;
    m.track.setTick(S);
    this.record();
    let n = 0;
    while (m.ticks < L && m.aliveCount() > 0 && n++ < MAX_STEPS) this.stepOnce(m.ticks + 1);
    m.drain(); // re-simulação: sem efeitos

    if (me && L >= S) {
      this.errX += bx - me.x;
      this.errY += by - me.y;
      if (Math.hypot(this.errX, this.errY) > ERR_SNAP) this.errX = this.errY = 0;
    }
    // Mudanças do botão antes de S já foram contadas lá (guarda a última anterior).
    let keep = 0;
    while (keep + 1 < this.changes.length && this.changes[keep + 1].k <= S) keep++;
    if (keep > 0) this.changes.splice(0, keep);
  }

  /** Some com o erro visual (chamar a cada quadro). */
  decay(dtMs: number) {
    const f = Math.exp(-dtMs / ERR_TAU_MS);
    this.errX *= f;
    this.errY *= f;
  }

  /** Estado para desenhar outro jogador: no máximo 300 ms além do último estado do servidor. */
  ghostSnap(slot: number): RunnerSnap | null {
    const run = this.match.runners[slot];
    if (!run) return null;
    const lim = this.serverTick + GHOST_MAX;
    if (this.match.ticks <= lim) return run.snapshot();
    return this.frameAt(lim)?.snaps[slot] ?? run.snapshot();
  }

  private stepOnce(k: number) {
    const m = this.match;
    for (const s of m.slots) {
      this.heldBuf[s] = s === this.me ? this.heldAt(k) : this.opts.ghostHeld ? this.opts.ghostHeld(s, k) : this.ghost[s];
    }
    m.step(this.heldBuf);
    this.record();
  }

  private record() {
    const m = this.match;
    const i = m.ticks % RING;
    const f = this.ring[i] ?? { tick: 0, snaps: [null, null, null, null] };
    f.tick = m.ticks;
    for (let s = 0; s < 4; s++) f.snaps[s] = m.runners[s] ? m.runners[s]!.snapshot() : null;
    this.ring[i] = f;
  }

  private frameAt(tick: number): Frame | null {
    const f = this.ring[tick % RING];
    return f && f.tick === tick ? f : null;
  }

  /** Percurso igual ao do servidor no passo dele: turbos pegos, cápsulas e peças. */
  private syncTrack(st: PartyState) {
    const tr = this.match.track;
    const sv = Array.from(st.vulcans);
    if (sv.length !== tr.vulcans.length || sv.some((x, i) => x !== tr.vulcans[i])) {
      let far = this.match.leaderX();
      for (const r of st.runners.values()) if (r.inMatch && r.x > far) far = r.x;
      tr.replay(sv, far + this.tune.lookahead);
    }
    for (const p of tr.pickups) p.taken = st.taken.has(String(p.id));
    for (const o of tr.obstacles) o.broken = st.broken.get(String(o.id)) ?? 0;
  }
}
