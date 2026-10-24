// Um jogador numa partida (mm3d-21): física, combustível, turbo, colisão e o
// reboque do modo em grupo. O percurso é compartilhado (track.ts); a ordem do
// passo (quem coleta primeiro, reboque, fim da pista) é da partida (match.ts).
//
// Só TypeScript que pode ser apagado (sem enum, sem parameter properties): o
// teste do backend carrega este arquivo direto e confere o espelho em JS.

import { FuelSystem } from './fuel';
import { difficultyAt, phaseOf } from './difficulty';
import { obstacleRects, type Pickup, type Rect } from './generator';
import type { Tuning } from './tuning';
import type { Track } from './track';

export type State = 'ready' | 'flying' | 'falling' | 'out_of_fuel' | 'dead';
export type DeathCause = 'obstacle' | 'floor' | 'ceiling';

export type GameEvent =
  | { type: 'start' }
  | { type: 'thrust_on' }
  | { type: 'thrust_off' }
  | { type: 'pickup'; kind: Pickup['kind']; added: number; x: number; y: number; id: number }
  | { type: 'fuel_low' }
  | { type: 'fuel_empty' }
  | { type: 'pass' }
  | { type: 'power_on'; until: number }
  | { type: 'power_off' }
  | { type: 'smash'; x: number; y: number; obstacle: number; piece: number }
  | { type: 'phase'; phase: number }
  | { type: 'dead'; cause: DeathCause };

/** Estado completo do jogador (predição/reconciliação no cliente). */
export interface RunnerSnap {
  x: number;
  y: number;
  vy: number;
  speed: number;
  state: State;
  thrusting: boolean;
  fuel: number;
  powerUntil: number;
  powered: boolean;
  towed: boolean;
  graceUntil: number;
  passedId: number;
  passed: number;
  phase: number;
  fuelCollected: number;
  pickupsTaken: number;
  smashed: number;
  deathTick: number;
}

export class Runner {
  readonly tune: Tuning;
  readonly fuel: FuelSystem;
  /** Eventos desde a última leitura. */
  readonly events: GameEvent[] = [];
  state: State = 'ready';
  x = 0;
  y: number;
  vy = 0;
  speed = 0;
  thrusting = false;
  fuelCollected = 0;
  pickupsTaken = 0;
  passed = 0;
  /** Maior id de obstáculo já ultrapassado (o "passou" é de cada um). */
  passedId = 0;
  phase = 1;
  /** Fim do turbo (tempo de jogo, s). */
  powerUntil = 0;
  smashed = 0;
  /** Grupo: preso na borda atrás do líder (não morre em obstáculo). */
  towed = false;
  /** Grupo: imune a obstáculo até este tempo (saída do reboque). */
  graceUntil = 0;
  /** Passo da partida em que morreu (0 = vivo). */
  deathTick = 0;
  private poweredFlag = false;
  private rects: Rect[] = [];

  constructor(tune: Tuning, startY: number = tune.startY) {
    this.tune = tune;
    this.y = startY;
    this.speed = difficultyAt(0).speed;
    this.fuel = new FuelSystem(tune.fuel.max, tune.fuel.start, tune.fuel.low);
    this.fuel.on((e) => {
      if (e.type === 'fuel_low') this.events.push({ type: 'fuel_low' });
      else if (e.type === 'fuel_empty') this.events.push({ type: 'fuel_empty' });
    });
  }

  get alive() {
    return this.state !== 'dead';
  }
  get distance() {
    return Math.max(0, this.x);
  }
  /** Turbo ativo no instante t. */
  poweredAt(t: number) {
    return t < this.powerUntil;
  }

  /** Largada: sai do "pronto". */
  start() {
    if (this.state !== 'ready') return;
    this.state = 'flying';
    this.events.push({ type: 'start' });
  }

  /** Física do passo (antes de coleta e colisão). `speedScale` < 1 = reagrupando. */
  move(held: boolean, t: number, speedScale = 1) {
    const tune = this.tune;
    const dt = tune.step;
    const thrust = held && !this.fuel.empty;
    if (thrust !== this.thrusting) {
      this.thrusting = thrust;
      this.events.push({ type: thrust ? 'thrust_on' : 'thrust_off' });
    }
    this.vy += ((thrust ? tune.thrust : 0) - tune.gravity) * dt;
    this.vy = Math.min(tune.maxUp, Math.max(-tune.maxFall, this.vy));
    this.y += this.vy * dt;
    this.speed = difficultyAt(this.x).speed * (this.poweredAt(t) ? tune.powerSpeed : speedScale);
    this.x += this.speed * dt;
    if (thrust) this.fuel.consume(tune.fuel.burn * dt);
    if (this.fuel.empty && this.thrusting) {
      this.thrusting = false;
      this.events.push({ type: 'thrust_off' });
    }
    this.state = this.fuel.empty ? 'out_of_fuel' : this.thrusting ? 'flying' : 'falling';

    const phase = phaseOf(this.x);
    if (phase !== this.phase) {
      this.phase = phase;
      this.events.push({ type: 'phase', phase });
    }
  }

  hitbox(): Rect {
    const { hitW, hitH } = this.tune;
    return { x0: this.x - hitW / 2, x1: this.x + hitW / 2, y0: this.y - hitH / 2, y1: this.y + hitH / 2 };
  }

  /** Cápsula ao alcance e ainda livre (a partida decide quem leva quando dois tocam juntos). */
  touches(p: Pickup): boolean {
    const hb = this.hitbox();
    const r = p.kind === 'vulcan' ? this.tune.vulcanR : this.tune.pickupR;
    if (p.taken || p.x - r > hb.x1 || p.x + r < hb.x0) return false;
    const cx = Math.min(hb.x1, Math.max(hb.x0, p.x));
    const cy = Math.min(hb.y1, Math.max(hb.y0, p.y));
    return (p.x - cx) ** 2 + (p.y - cy) ** 2 <= r * r;
  }

  /** Pega todas as cápsulas que toca (na ordem do percurso). */
  collect(track: Track, t: number) {
    for (const p of track.pickups) if (this.touches(p)) this.take(track, p, t);
  }

  /** Esta cápsula é dele. */
  take(track: Track, p: Pickup, t: number) {
    track.take(p);
    const added = this.fuel.collect(this.tune.fuel[p.kind]);
    this.fuelCollected += added;
    this.pickupsTaken++;
    this.events.push({ type: 'pickup', kind: p.kind, added, x: p.x, y: p.y, id: p.id });
    if (p.kind === 'vulcan') {
      this.powerUntil = t + this.tune.powerTime;
      this.poweredFlag = true;
      this.events.push({ type: 'power_on', until: this.powerUntil });
    }
  }

  /** Avisa o fim do turbo. */
  checkPowerEnd(t: number) {
    if (this.poweredFlag && !this.poweredAt(t)) {
      this.poweredFlag = false;
      this.events.push({ type: 'power_off' });
    }
  }

  /** Chão/teto sempre matam; obstáculo não mata rebocado nem imune; com turbo, quebra a peça. */
  collide(track: Track, t: number): DeathCause | null {
    const tune = this.tune;
    const hb = this.hitbox();
    if (hb.y0 <= tune.floor) return 'floor';
    if (hb.y1 >= tune.ceiling) return 'ceiling';
    if (this.towed || t < this.graceUntil) return null;
    const powered = this.poweredAt(t);
    for (const o of track.obstacles) {
      if (o.x > hb.x1 || o.x + o.w < hb.x0) continue;
      const rects = obstacleRects(o, t, tune, this.rects);
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        if (o.broken & (1 << i)) continue;
        if (!(r.x0 < hb.x1 && r.x1 > hb.x0 && r.y0 < hb.y1 && r.y1 > hb.y0)) continue;
        if (!powered) return 'obstacle';
        // Turbo: a peça se parte (para todos) e o jogador segue.
        o.broken |= 1 << i;
        this.smashed++;
        const y = Math.min(r.y1, Math.max(r.y0, this.y));
        this.events.push({ type: 'smash', x: Math.max(r.x0, hb.x0), y, obstacle: o.id, piece: i });
      }
    }
    return null;
  }

  /** Obstáculos que ele acabou de ultrapassar. */
  countPassed(track: Track) {
    const edge = this.x - this.tune.hitW / 2;
    for (const o of track.obstacles) {
      if (o.id > this.passedId && o.x + o.w < edge) {
        this.passedId = o.id;
        this.passed++;
        this.events.push({ type: 'pass' });
      }
    }
  }

  die(cause: DeathCause, tick: number) {
    if (this.poweredFlag) this.events.push({ type: 'power_off' });
    this.poweredFlag = false;
    this.powerUntil = 0;
    if (this.thrusting) this.events.push({ type: 'thrust_off' });
    this.thrusting = false;
    this.state = 'dead';
    this.deathTick = tick;
    this.events.push({ type: 'dead', cause });
  }

  drain(): GameEvent[] {
    const out = this.events.slice();
    this.events.length = 0;
    return out;
  }

  snapshot(): RunnerSnap {
    return {
      x: this.x,
      y: this.y,
      vy: this.vy,
      speed: this.speed,
      state: this.state,
      thrusting: this.thrusting,
      fuel: this.fuel.value,
      powerUntil: this.powerUntil,
      powered: this.poweredFlag,
      towed: this.towed,
      graceUntil: this.graceUntil,
      passedId: this.passedId,
      passed: this.passed,
      phase: this.phase,
      fuelCollected: this.fuelCollected,
      pickupsTaken: this.pickupsTaken,
      smashed: this.smashed,
      deathTick: this.deathTick,
    };
  }

  restore(s: RunnerSnap) {
    this.x = s.x;
    this.y = s.y;
    this.vy = s.vy;
    this.speed = s.speed;
    this.state = s.state;
    this.thrusting = s.thrusting;
    this.fuel.setValue(s.fuel);
    this.powerUntil = s.powerUntil;
    this.poweredFlag = s.powered;
    this.towed = s.towed;
    this.graceUntil = s.graceUntil;
    this.passedId = s.passedId;
    this.passed = s.passed;
    this.phase = s.phase;
    this.fuelCollected = s.fuelCollected;
    this.pickupsTaken = s.pickupsTaken;
    this.smashed = s.smashed;
    this.deathTick = s.deathTick;
  }
}
