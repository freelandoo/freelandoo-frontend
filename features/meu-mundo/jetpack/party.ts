// Jetpack em grupo (mm3d-21): o controlador das telas de até 4 jogadores,
// por cima das MESMAS peças do jogo sozinho (palco, cenário, partículas, HUD,
// som e toque chegam prontos de game.ts no `kit`).
//
// Estados (root[data-state]): joining → lobby (janela de espera: "Começar" ou
// "Entrar sozinho") → pcount (contagem; "SEGURE") → pplay → spectate (saiu;
// os outros seguem) → results → lobby … O servidor (JetpackRoom) decide as
// fases; o cliente prevê o próprio jogador (net/predict.ts) e desenha todos
// numa câmera igual para todos, que segue o líder (party-camera.ts).
//
// Queda segura: sem sala em 4 s (ou sem rede), avisa "Jogando sozinho" e cai
// no jogo de sempre. "Entrar sozinho" sai da sala e joga o de sempre; ao
// voltar dele, entra na espera de novo.

import * as THREE from 'three';
import { PartyNet, type PartyRunnerState, type PartyState } from './net/party-net';
import { PartySim } from './net/predict';
import { PARTY, type MatchEvent } from './sim/match';
import type { RunnerSnap } from './sim/runner';
import { TUNING } from './sim/tuning';
import { partyCameraFocus, CameraSpring } from './party-camera';
import { AvatarAssets, AvatarView } from './render/avatar';
import { NameTags } from './render/names';
import type { Stage } from './render/stage';
import type { Environment } from './render/environment';
import type { ObstacleRenderer, PickupRenderer } from './render/obstacles';
import type { Particles } from './render/particles';
import type { GameAudio } from './audio';
import type { Input } from './input';
import { BODY_IDS, type BodyId, type JetpackSession, type NetStatus } from '../types';

const STEP_MS = TUNING.step * 1000;
const JOIN_TIMEOUT_MS = 4000;
/** Profundidade dos outros (atrás do próprio jogador). */
const OTHER_Z = -0.35;

export type PartyPageState = 'joining' | 'lobby' | 'pcount' | 'pplay' | 'spectate' | 'results';
export const PARTY_STATES: readonly string[] = ['joining', 'lobby', 'pcount', 'pplay', 'spectate', 'results'];

/** Textos já traduzidos. `{n}` é trocado aqui. */
export interface PartyTexts {
  joining: string;
  waiting: string;
  alone: string;
  startsIn: string;
  readyTag: string;
  emptySlot: string;
  you: string;
  out: string;
  place: string;
  caps: string;
  soloFallback: string;
  reconnecting: string;
  replaced: string;
  ready: string;
  unready: string;
}

export interface PartyKit {
  root: HTMLElement;
  frame: HTMLElement;
  stage: Stage;
  env: Environment;
  fire: Particles;
  smoke: Particles;
  glow: THREE.Texture;
  obstacles: ObstacleRenderer;
  pickups: PickupRenderer;
  player: AvatarView;
  audio: GameAudio;
  input: Input;
  texts: PartyTexts;
  setState: (s: string) => void;
  /** Número grande da contagem. */
  count: HTMLElement;
  /** Efeitos do jogo (mesmos do sozinho). */
  burst: (x: number, y: number, c: [number, number, number], n: number) => void;
  debris: (x: number, y: number) => void;
  toast: (text: string, kind: 'fuel' | 'warn' | 'phase' | 'power') => void;
  /** Evento do próprio jogador: o mesmo tratamento do jogo sozinho (som, toast, HUD). */
  ownEvent: (e: MatchEvent) => void;
  /** HUD a partir do próprio jogador. */
  hud: (distance: number, fuelRatio: number, low: boolean, empty: boolean, powerLeft: number) => void;
  /** Recorde no aparelho; devolve se bateu. */
  record: (distance: number) => boolean;
  fetchParty: (roomId: string | null) => Promise<JetpackSession | null>;
  /** Jogar o de sempre (botão ou queda segura). */
  solo: () => void;
  exit: () => void;
}

const isBody = (b: string): b is BodyId => (BODY_IDS as string[]).includes(b);
/** Garante o clipe pelo estado (só troca quando muda; predição de batida desfeita volta a voar). */
const syncClip = (av: AvatarView, want: 'idle' | 'fly' | 'impact') => {
  if (av.clip !== want) av.play(want, want === 'impact' ? 0.08 : 0.2);
};
const fill = (s: string, n: number | string) => s.replace('{n}', String(n));

/** Segura até a altura alvo (piloto do harness). */
function hover(r: { y: number; vy: number }, target: number) {
  return r.vy < 0
    ? r.y - (r.vy * r.vy) / (2 * (TUNING.thrust - TUNING.gravity)) - 0.1 < target
    : r.y + (r.vy * r.vy) / (2 * TUNING.gravity) + 0.1 < target;
}

export class PartyMode {
  private readonly kit: PartyKit;
  private net: PartyNet | null = null;
  private sim: PartySim | null = null;
  private seed = 0;
  private slot = -1;
  private st: PartyState | null = null;
  private page: PartyPageState | null = null;
  private others = new Map<number, AvatarView>();
  private loading = new Set<number>();
  private assets = new AvatarAssets();
  private names: NameTags;
  private spring = new CameraSpring();
  private localF = 0;
  private running = false;
  private countEnd = 0;
  private meDead = false;
  private deathY = 0;
  private deathVy = 0;
  private resultsKey = '';
  private lobbyKey = '';
  private joinTimer = 0;
  private recorded = false;
  private disposed = false;
  private readonly $: <T extends HTMLElement = HTMLElement>(id: string) => T;
  private readonly offs: (() => void)[] = [];
  /** Harness: piloto automático. */
  auto = false;

  constructor(kit: PartyKit) {
    this.kit = kit;
    this.$ = <T extends HTMLElement = HTMLElement>(id: string) => kit.root.querySelector(`#${id}`) as T;
    this.names = new NameTags(kit.frame);
    const click = (id: string, fn: () => void) => {
      const el = this.$(id);
      if (!el) return;
      const h = () => {
        kit.audio.unlock();
        kit.audio.play('ui');
        fn();
      };
      el.addEventListener('click', h);
      this.offs.push(() => el.removeEventListener('click', h));
    };
    click('jg-ready', () => this.toggleReady());
    click('jg-solo', () => this.goSolo());
    click('jg-lobby-back', () => this.leave());
    click('jg-spec-leave', () => this.leave());
    click('jg-res-again', () => this.net?.ready(true));
    click('jg-res-back', () => this.leave());
    // Aba escondida (mm3d-27): solta o botão já (a partida segue no servidor).
    const onHide = () => {
      if (document.hidden) this.sim?.release();
    };
    document.addEventListener('visibilitychange', onHide);
    this.offs.push(() => document.removeEventListener('visibilitychange', onHide));
  }

  /** Está desenhando (estados do grupo)? */
  get active() {
    return this.page !== null;
  }

  // ── entrar / sair ─────────────────────────────────────────────────────────

  /** Entra na espera (primeira vez, ou de volta do jogo sozinho). */
  async join(roomId: string | null = null) {
    if (this.disposed) return;
    this.setPage('joining');
    this.resetScene();
    const timeout = new Promise<null>((r) => (this.joinTimer = window.setTimeout(() => r(null), JOIN_TIMEOUT_MS)));
    let session: JetpackSession | null = null;
    try {
      session = await Promise.race([this.kit.fetchParty(roomId), timeout]);
    } catch {
      session = null;
    }
    clearTimeout(this.joinTimer);
    if (this.disposed || this.page !== 'joining') return;
    if (!session) return this.fallback();
    const net = new PartyNet({
      onStatus: (s) => this.onStatus(s),
      onWelcome: (p) => {
        this.slot = p.slot;
        this.kit.player.setSlot(p.slot);
      },
      fetchParty: async (rid) => (await this.kit.fetchParty(rid))?.multiplayer ?? null,
      onState: (st) => this.onState(st),
    });
    this.net = net;
    this.joinTimer = window.setTimeout(() => {
      if (this.page === 'joining') this.fallback();
    }, JOIN_TIMEOUT_MS);
    await net.connect(session.multiplayer);
  }

  private onStatus(s: NetStatus) {
    if (this.disposed) return;
    if (s === 'reconnecting') this.kit.toast(this.kit.texts.reconnecting, 'warn');
    else if (s === 'replaced') {
      this.kit.toast(this.kit.texts.replaced, 'warn');
      this.dropNet();
      this.kit.exit();
    } else if (s === 'offline') this.fallback();
  }

  /** Sem sala: avisa e joga o de sempre. */
  private fallback() {
    clearTimeout(this.joinTimer);
    this.dropNet();
    this.kit.toast(this.kit.texts.soloFallback, 'warn');
    this.goSoloNow();
  }

  private goSolo() {
    this.dropNet();
    this.goSoloNow();
  }

  private goSoloNow() {
    this.resetScene();
    this.page = null;
    this.names.hideAll();
    this.kit.player.setSlot(0);
    this.kit.player.setFade(1);
    this.kit.solo();
  }

  private leave() {
    this.dropNet();
    this.kit.exit();
  }

  private dropNet() {
    this.net?.dispose();
    this.net = null;
    this.sim = null;
    this.st = null;
    this.slot = -1;
  }

  private toggleReady() {
    const me = this.mine();
    this.net?.ready(!(me && me.ready));
  }

  private mine(): PartyRunnerState | null {
    if (!this.st || !this.net) return null;
    const sid = this.net.sessionId;
    return (sid && this.st.runners.get(sid)) || null;
  }

  // ── estado da sala ────────────────────────────────────────────────────────

  private onState(st: PartyState) {
    if (this.disposed) return;
    this.st = st;
    clearTimeout(this.joinTimer);
    // Quem sou eu sai do sessionId, não da vaga (mm3d-27b): o Colyseus manda o
    // estado completo ANTES da mensagem "welcome", e com a vaga ainda -1 o
    // próprio jogador ganhava um boneco de "outro" — dois de si em cada tela.
    const sid = this.net?.sessionId;
    const own = sid ? st.runners.get(sid) : undefined;
    if (own && own.slot !== this.slot) {
      this.slot = own.slot;
      this.kit.player.setSlot(own.slot);
    }
    st.runners.forEach((r, key) => {
      if (key !== sid) this.ensureAvatar(r);
    });
    if (st.phase === 'countdown' || st.phase === 'running') {
      if (!this.sim || this.seed !== st.seed) this.newMatch(st);
      if (st.phase === 'running' && this.sim) this.sim.reconcile(st);
    }
    const page: PartyPageState =
      st.phase === 'lobby'
        ? 'lobby'
        : st.phase === 'countdown'
          ? 'pcount'
          : st.phase === 'running'
            ? this.sim && this.sim.runner && !this.sim.outConfirmed
              ? 'pplay'
              : 'spectate'
            : 'results';
    if (page !== this.page) this.enter(page);
    if (page === 'lobby') this.renderLobby(st);
    if (page === 'results') this.renderResults(st);
    if (page === 'spectate') this.renderSpectate();
  }

  private enter(page: PartyPageState) {
    const prev = this.page;
    this.setPage(page);
    if (page === 'lobby') {
      this.sim = null;
      this.running = false;
      this.resetScene();
    }
    if (page === 'pcount') {
      this.countEnd = performance.now() + PARTY.countdownMs - (this.net?.clock.rtt ?? 0) / 2;
      this.kit.audio.unlock();
    }
    if (page === 'results') {
      this.kit.audio.setJet(false);
      const me = this.sim?.runner;
      if (me && !this.recorded) {
        this.recorded = true;
        if (this.kit.record(Math.floor(me.distance))) this.kit.audio.play('record');
      }
    }
    if (page === 'spectate' && prev === 'pplay') this.kit.audio.setJet(false);
  }

  private setPage(page: PartyPageState) {
    this.page = page;
    this.kit.setState(page);
  }

  private newMatch(st: PartyState) {
    const slots: number[] = [];
    for (const r of st.runners.values()) if (r.inMatch) slots.push(r.slot);
    if (!slots.length) return;
    this.seed = st.seed;
    const me = slots.includes(this.slot) ? this.slot : -1;
    this.sim = new PartySim(st.seed, slots, me, { send: (k, h) => this.net?.input(k, h) });
    this.running = false;
    this.meDead = false;
    this.recorded = false;
    this.resultsKey = '';
    this.resetScene();
    this.spring.reset();
    this.kit.player.play('idle', 0.2);
    for (const av of this.others.values()) av.play('idle', 0.2);
  }

  private resetScene() {
    this.kit.obstacles.reset();
    this.kit.pickups.reset();
    this.kit.fire.clear();
    this.kit.smoke.clear();
    delete this.kit.root.dataset.power;
    this.kit.player.setPower(0);
    this.kit.player.setFade(1);
  }

  /** Avatar de outra vaga (baixa o corpo uma vez por sessão). */
  private ensureAvatar(r: PartyRunnerState) {
    if (r.slot === this.slot || this.others.has(r.slot) || this.loading.has(r.slot)) return;
    this.loading.add(r.slot);
    const k = this.kit;
    const av = new AvatarView(k.stage.scene, k.fire, k.smoke, k.glow);
    av.emitScale = 0.5;
    av.root.visible = false;
    av.load(isBody(r.body) ? r.body : 'normal', undefined, this.assets).then(
      () => {
        this.loading.delete(r.slot);
        if (this.disposed) return;
        av.setSlot(r.slot);
        this.others.set(r.slot, av);
      },
      () => this.loading.delete(r.slot),
    );
  }

  // ── telas ─────────────────────────────────────────────────────────────────

  private renderLobby(st: PartyState) {
    const t = this.kit.texts;
    const people = [...st.runners.values()];
    const bySlot = new Map(people.map((r) => [r.slot, r]));
    const me = this.mine();
    const left = st.until ? Math.max(0, Math.ceil((st.until - Date.now()) / 1000)) : 0;
    const info = people.length < 2 ? t.alone : st.until ? fill(t.startsIn, left) : fill(t.waiting, `${people.length}/${PARTY.max}`);
    const key = JSON.stringify([people.map((r) => [r.slot, r.name, r.ready]), info, me?.ready, this.slot]);
    if (key === this.lobbyKey) return;
    this.lobbyKey = key;
    const list = this.$('jg-lobby-list');
    list.replaceChildren(
      ...[0, 1, 2, 3].map((s) => {
        const r = bySlot.get(s);
        const li = document.createElement('li');
        li.dataset.slot = String(s);
        if (!r) {
          li.className = 'empty';
          li.textContent = t.emptySlot;
          return li;
        }
        if (r.ready) li.classList.add('ready');
        if (s === this.slot) li.classList.add('me');
        const name = document.createElement('b');
        name.textContent = s === this.slot ? `${r.name} · ${t.you}` : r.name;
        const tag = document.createElement('span');
        tag.textContent = r.ready ? t.readyTag : '…';
        li.append(name, tag);
        return li;
      }),
    );
    this.$('jg-lobby-info').textContent = info;
    this.$('jg-ready').textContent = me?.ready ? t.unready : t.ready;
  }

  private renderSpectate() {
    const me = this.sim?.runner;
    this.$('jg-spec-text').textContent = fill(this.kit.texts.out, Math.floor(me ? me.distance : 0));
  }

  private renderResults(st: PartyState) {
    const t = this.kit.texts;
    const rows = [...st.runners.values()].filter((r) => r.inMatch && r.place > 0).sort((a, b) => a.place - b.place || a.slot - b.slot);
    const key = JSON.stringify(rows.map((r) => [r.slot, r.place, r.x, r.got, r.ready]));
    if (key === this.resultsKey) return;
    this.resultsKey = key;
    this.$('jg-res-list').replaceChildren(
      ...rows.map((r) => {
        const li = document.createElement('li');
        li.dataset.slot = String(r.slot);
        if (r.slot === this.slot) li.classList.add('me');
        if (r.ready) li.classList.add('ready');
        const pos = document.createElement('i');
        pos.textContent = fill(t.place, r.place);
        const name = document.createElement('b');
        name.textContent = r.slot === this.slot ? `${r.name} · ${t.you}` : r.name;
        const dist = document.createElement('span');
        dist.className = 'mono';
        dist.textContent = `${Math.floor(Math.max(0, r.x))} m`;
        const caps = document.createElement('small');
        caps.textContent = fill(t.caps, r.got);
        li.append(pos, name, dist, caps);
        return li;
      }),
    );
  }

  // ── quadro ────────────────────────────────────────────────────────────────

  /** Um quadro dos estados do grupo (chamado por game.ts). */
  frame(now: number, dt: number, time: number) {
    const k = this.kit;
    const sim = this.sim;
    const st = this.st;
    const page = this.page;
    let events: MatchEvent[] = [];

    if (page === 'pcount' && sim) {
      k.count.textContent = String(Math.max(1, Math.ceil((this.countEnd - now) / 1000)));
      sim.prime(this.held(sim));
    }
    if (sim && st && st.phase === 'running') {
      const clock = this.net?.clock;
      if (!this.running) {
        this.running = true;
        this.localF = st.tick + (clock ? clock.rtt / 2 / STEP_MS + clock.lead() : 0);
      } else if (clock && clock.ready) {
        if (clock.shouldJump(this.localF, now)) this.localF = clock.target(now);
        else this.localF += (dt * 1000 * clock.pace(this.localF, now)) / STEP_MS;
      } else this.localF += (dt * 1000) / STEP_MS;
      events = sim.advance(Math.floor(this.localF), this.held(sim));
      sim.decay(dt * 1000);
    }
    for (const e of events) this.event(e);

    this.draw(dt, time);
  }

  private held(sim: PartySim) {
    const me = sim.runner;
    if (!me || !me.alive) return false;
    if (this.auto) {
      // Cada vaga numa faixa de altura (o harness vê os 4 separados); cápsula perto da faixa, ela.
      const lane = PARTY.startY[Math.max(0, this.slot)];
      const next = sim.match.track.pickups.find((p) => !p.taken && p.kind !== 'vulcan' && p.x > me.x + 1 && Math.abs(p.y - lane) < 1.5);
      return hover(me, next ? next.y : lane);
    }
    return this.kit.input.held;
  }

  private event(e: MatchEvent) {
    const k = this.kit;
    if (e.slot === this.slot) {
      if (e.type === 'dead') {
        this.meDead = true;
        const me = this.sim?.runner;
        this.deathY = me ? me.y : 0;
        this.deathVy = Math.max(me ? me.vy : 0, 2);
      }
      k.ownEvent(e);
      return;
    }
    const av = this.others.get(e.slot);
    switch (e.type) {
      case 'start':
        av?.play('fly', 0.2);
        break;
      case 'thrust_off':
        av?.puff();
        break;
      case 'pickup':
        k.burst(e.x, e.y, e.kind === 'vulcan' ? [1, 0.12, 0.04] : [0.3, 0.95, 1], e.kind === 'vulcan' ? 30 : 12);
        break;
      case 'smash':
        k.debris(e.x, e.y);
        k.stage.addShake(0.2);
        break;
      case 'dead':
        if (av) {
          av.play('impact', 0.08);
          const p = av.packWorld(new THREE.Vector3());
          k.burst(p.x, p.y, [1, 0.45, 0.1], 24);
        }
        break;
    }
  }

  private draw(dt: number, time: number) {
    const k = this.kit;
    const sim = this.sim;
    const st = this.st;
    const inRace = !!sim && (this.page === 'pplay' || this.page === 'spectate' || this.page === 'pcount' || this.page === 'results');
    const W = k.stage.viewWidth;
    const cam = k.stage.camera;
    const w = k.frame.clientWidth;
    const h = k.frame.clientHeight;
    const frozen = this.page === 'pcount';

    // Próprio jogador
    const me = inRace && sim ? sim.runner : null;
    if (me) {
      if (this.meDead && me.alive) {
        this.meDead = false; // a predição errou a batida
        k.player.play('fly', 0.1);
      }
      let y = me.y + sim!.errY;
      if (!me.alive) {
        this.deathVy -= TUNING.gravity * dt;
        this.deathY = Math.max(TUNING.floor + 0.25, this.deathY + this.deathVy * dt);
        y = this.deathY;
      }
      k.player.root.visible = true;
      k.player.root.position.set(me.x + sim!.errX, y, 0);
      if (this.page !== 'pcount') syncClip(k.player, me.alive ? 'fly' : 'impact');
      const t = sim!.match.track.t;
      const mode = this.page === 'pcount' ? 'ready' : !me.alive ? 'dead' : me.fuel.empty ? 'empty' : 'play';
      k.player.setTimeScale(mode === 'empty' ? 0.45 : 1);
      const left = me.alive ? Math.max(0, me.powerUntil - t) : 0;
      k.player.setPower(left);
      k.player.setFade(me.towed ? 0.5 : 1);
      k.player.update(dt, time, me.thrusting && !frozen, me.vy, mode);
      k.hud(me.distance, me.fuel.ratio, me.fuel.isLow, me.fuel.empty, left);
    } else if (inRace) {
      k.player.root.visible = false;
    }

    // Outros (fantasmas da predição)
    let order = 1;
    for (const [slot, av] of this.others) {
      // A própria vaga nunca desenha um "outro" (vaga trocada depois de sair e voltar).
      if (slot === this.slot) {
        av.root.visible = false;
        continue;
      }
      const r = st ? [...st.runners.values()].find((x) => x.slot === slot) : null;
      let snap: RunnerSnap | null = null;
      if (inRace && sim && r && r.inMatch) snap = sim.ghostSnap(slot);
      const lobbyView = !inRace && r;
      av.root.visible = !!snap || !!lobbyView;
      if (snap) {
        const ge = sim!.ghostErr(slot);
        av.root.position.set(snap.x + ge.x, snap.state === 'dead' ? Math.max(TUNING.floor + 0.25, snap.y) : snap.y + ge.y, OTHER_Z * order);
        // Pose pelo ESTADO, não por evento (mm3d-27): "start" e "dead" dos outros
        // costumam acontecer dentro da re-simulação, cujos eventos são
        // descartados — o boneco ficava em pé voando e não caía ao bater.
        if (this.page !== 'pcount') syncClip(av, snap.state === 'ready' ? 'idle' : snap.state === 'dead' ? 'impact' : 'fly');
        const t = sim!.match.track.t;
        av.setPower(snap.state !== 'dead' ? Math.max(0, snap.powerUntil - t) : 0);
        av.setFade(snap.towed ? 0.45 : 1);
        const mode = this.page === 'pcount' ? 'ready' : snap.state === 'dead' ? 'dead' : snap.fuel <= 0 ? 'empty' : 'play';
        av.update(dt, time, snap.thrusting && !frozen, snap.vy, mode);
      } else if (lobbyView) {
        av.root.position.set(1.4 * order, PARTY.startY[slot], OTHER_Z * order);
        av.setFade(1);
        av.update(dt, time, false, 0, 'ready');
      }
      order++;
    }
    if (!inRace) {
      // Espera: o próprio no começo da fila, os outros ao lado.
      k.player.root.visible = this.slot >= 0;
      k.player.root.position.set(0, this.slot >= 0 ? PARTY.startY[this.slot] : TUNING.startY, 0);
      k.player.setFade(1);
      k.player.update(dt, time, false, 0, 'ready');
    }

    // Câmera: o líder (vivo mais à frente); sem corrida, a fila parada.
    let leaderX = 0;
    let tailX = 0;
    if (inRace && sim) {
      leaderX = sim.match.leaderX();
      tailX = sim.match.tailX();
      if (me && me.alive) {
        leaderX = Math.max(leaderX, me.x);
        tailX = Math.min(tailX, me.x);
      }
    }
    const focus = partyCameraFocus(leaderX, tailX, W);
    const screenX = this.spring.update(focus.screenX, dt);

    if (!frozen) {
      k.fire.update(dt);
      k.smoke.update(dt);
    }
    const track = inRace && sim ? sim.match.track : null;
    k.obstacles.update(track ? track.obstacles : [], track ? track.t : 0, time);
    k.pickups.update(track ? track.pickups : [], time, frozen ? 0 : dt);
    k.env.update(cam.position.x, time);
    k.stage.render(leaderX, dt, time, screenX);

    // Nomes (depois da câmera do quadro)
    if (st) {
      for (const r of st.runners.values()) {
        const mine = r.slot === this.slot;
        this.names.set(r.slot, mine ? this.kit.texts.you : r.name, mine);
        const obj = mine ? k.player.root : this.others.get(r.slot)?.root;
        const vis = !!obj && obj.visible && this.page !== 'results' && this.page !== 'joining';
        const fade = mine ? (me && me.towed ? 0.5 : 1) : 1;
        if (obj) this.names.place(r.slot, obj.position.x, obj.position.y, obj.position.z, cam, w, h, vis, fade);
      }
      for (const slot of [0, 1, 2, 3]) if (![...st.runners.values()].some((r) => r.slot === slot)) this.names.remove(slot);
    }
  }

  /** Estado para o harness. */
  debug() {
    return { page: this.page, slot: this.slot, phase: this.st?.phase, seed: this.seed, sim: this.sim, net: this.net, corrections: this.sim?.corrections ?? 0 };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    clearTimeout(this.joinTimer);
    for (const off of this.offs) off();
    this.dropNet();
    this.names.dispose();
  }
}
