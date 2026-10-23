// Partida do jetpack para 1 a 4 jogadores (mm3d-21). Um percurso (track.ts),
// um jogador por vaga (runner.ts), todos largando no mesmo passo.
//
// Grupo (2+): a velocidade horizontal não depende do botão, só da distância e
// do turbo — o turbo é a única coisa que separa os jogadores. Quem fica mais
// de PARTY.maxSpread atrás do líder é REBOCADO na borda (continua na tela,
// imune a obstáculo; chão e teto ainda matam) e ganha PARTY.towGrace de
// imunidade ao soltar. Quem está na frente sem turbo voa a PARTY.regroup até
// a coluna se refazer. Cápsula: leva quem toca primeiro (maior x; empate →
// menor vaga). Peça quebrada some para todos.
//
// Sozinho, é exatamente o jogo do mm3d-20 (fixture de ouro no backend).
//
// Ordem do passo: 1 movimento (com reagrupar) → 2 reboque → 3 coleta →
// 4 fim do turbo → 5 colisão → 6 "passou" → 7 pista (gera à frente do líder,
// recicla atrás da rabeira).
//
// Só TypeScript que pode ser apagado: o teste do backend carrega este arquivo
// direto e compara, passo a passo, com o espelho em JS.

import { Track } from './track';
import { Runner, type GameEvent } from './runner';
import { TUNING, type Tuning } from './tuning';

export const PARTY = {
  max: 4,
  /** m atrás do líder antes do reboque. */
  maxSpread: 4.5,
  /** Velocidade de quem está na frente sem turbo, até a coluna se refazer. */
  regroup: 0.85,
  /** s de imunidade a obstáculo ao sair do reboque. */
  towGrace: 0.6,
  /** Altura de largada por vaga (em grupo). */
  startY: [6.5, 7.7, 5.3, 8.9],
  lobbyMs: 20000,
  relobbyMs: 15000,
  countdownMs: 3000,
  resultsMs: 8000,
} as const;

export type MatchEvent = GameEvent & { slot: number };

export interface Placement {
  slot: number;
  place: number;
  distance: number;
  deathTick: number;
}

export interface MatchOptions {
  /** Sozinho (mm3d-20): a partida só larga no primeiro toque. Em grupo, quem larga é o servidor (start()). */
  startOnHold?: boolean;
}

export class Match {
  readonly tune: Tuning;
  readonly track: Track;
  /** Índice = vaga 0..3 (null = vaga vazia). */
  readonly runners: (Runner | null)[];
  readonly slots: number[];
  ticks = 0;
  started = false;
  private readonly startOnHold: boolean;
  private readonly group: boolean;
  private order: Runner[] = [];

  constructor(seed: number, slots: readonly number[], tune: Tuning = TUNING, opts: MatchOptions = {}) {
    this.tune = tune;
    this.track = new Track(seed, tune);
    this.slots = [...slots].sort((a, b) => a - b);
    this.group = this.slots.length > 1;
    this.startOnHold = opts.startOnHold ?? false;
    this.runners = [null, null, null, null];
    for (const s of this.slots) this.runners[s] = new Runner(tune, this.group ? PARTY.startY[s] : tune.startY);
  }

  get seed() {
    return this.track.seed;
  }

  /** Largada (todos no mesmo passo). */
  start() {
    if (this.started) return;
    this.started = true;
    for (const s of this.slots) this.runners[s]!.start();
  }

  private alive(): Runner[] {
    const out: Runner[] = [];
    for (const s of this.slots) {
      const r = this.runners[s]!;
      if (r.alive) out.push(r);
    }
    return out;
  }

  aliveCount() {
    return this.alive().length;
  }

  /** x do vivo mais à frente (sem vivos: de todos). */
  leaderX() {
    const a = this.alive();
    const list = a.length ? a : this.slots.map((s) => this.runners[s]!);
    let m = -Infinity;
    for (const r of list) if (r.x > m) m = r.x;
    return m;
  }

  /** x do vivo mais atrás (sem vivos: de todos). */
  tailX() {
    const a = this.alive();
    const list = a.length ? a : this.slots.map((s) => this.runners[s]!);
    let m = Infinity;
    for (const r of list) if (r.x < m) m = r.x;
    return m;
  }

  /** Um passo fixo. `held[vaga]`: segurando. */
  step(held: readonly boolean[]) {
    if (!this.started) {
      if (!this.startOnHold || !this.slots.some((s) => held[s])) return;
      this.start();
    }
    if (this.aliveCount() === 0) return;
    const tune = this.tune;
    this.ticks++;
    this.track.setTick(this.ticks);
    const t = this.track.t;

    // 1. movimento (em grupo, quem está na frente sem turbo reagrupa)
    const tail = this.tailX();
    for (const s of this.slots) {
      const r = this.runners[s]!;
      if (!r.alive) continue;
      const scale = this.group && !r.poweredAt(t) && r.x > tail + 0.02 ? PARTY.regroup : 1;
      r.move(!!held[s], t, scale);
    }

    // 2. reboque
    if (this.group) {
      const edge = this.leaderX() - PARTY.maxSpread;
      for (const r of this.alive()) {
        if (r.x < edge) {
          r.x = edge;
          r.towed = true;
        } else if (r.towed) {
          r.towed = false;
          r.graceUntil = t + PARTY.towGrace;
        }
      }
    }

    // 3. coleta: quem está mais à frente primeiro (empate → menor vaga)
    const order = this.order;
    order.length = 0;
    for (const s of this.slots) {
      const r = this.runners[s]!;
      if (r.alive) order.push(r);
    }
    if (order.length > 1) order.sort((a, b) => b.x - a.x || this.runners.indexOf(a) - this.runners.indexOf(b));
    for (const r of order) r.collect(this.track, t);

    // 4. fim do turbo
    for (const r of order) r.checkPowerEnd(t);

    // 5. colisão
    for (const r of order) {
      const cause = r.collide(this.track, t);
      if (cause) r.die(cause, this.ticks);
    }

    // 6–7. "passou" e pista (só se alguém segue vivo)
    const alive = this.alive();
    if (!alive.length) return;
    for (const r of alive) r.countPassed(this.track);
    this.track.recycleBehind(this.tailX() - 14);
    this.track.fillTo(this.leaderX() + tune.lookahead);
  }

  drain(): MatchEvent[] {
    const out: MatchEvent[] = [];
    for (const s of this.slots) for (const e of this.runners[s]!.drain()) out.push({ ...e, slot: s });
    return out;
  }

  /**
   * Colocação: quem segue vivo na frente (por distância), depois por ordem de
   * morte (morreu depois = melhor); no mesmo passo, maior distância; empate
   * total = mesma posição.
   */
  placements(): Placement[] {
    const rows = this.slots.map((s) => {
      const r = this.runners[s]!;
      return { slot: s, distance: r.distance, deathTick: r.alive ? Infinity : r.deathTick };
    });
    rows.sort((a, b) => b.deathTick - a.deathTick || b.distance - a.distance || a.slot - b.slot);
    const out: Placement[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prev = out[i - 1];
      const tie = i > 0 && rows[i - 1].deathTick === row.deathTick && rows[i - 1].distance === row.distance;
      out.push({
        slot: row.slot,
        place: tie ? prev.place : i + 1,
        distance: row.distance,
        deathTick: row.deathTick === Infinity ? 0 : row.deathTick,
      });
    }
    return out;
  }
}
