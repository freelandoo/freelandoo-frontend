// Partida de UMA pessoa, com a API de sempre (game.ts e autopilot.ts não
// mudam). Desde o mm3d-21 é um invólucro de Match com uma vaga: a regra mora
// em track.ts (percurso), runner.ts (jogador) e match.ts (ordem do passo).
// O fixture de ouro no backend garante que o jogo sozinho é o do mm3d-20.
//
// Sem Three.js nem DOM: roda igual no navegador e nos testes. Avança sempre em
// passos fixos (tune.step); quem chama acumula o tempo real do quadro e chama
// step() quantas vezes precisar.

import { Match } from './match';
import type { Runner } from './runner';
import { TUNING, type Tuning } from './tuning';

export type { State, DeathCause, GameEvent } from './runner';

export class World {
  readonly tune: Tuning;
  private match!: Match;
  private me!: Runner;

  constructor(seed: number, tune: Tuning = TUNING) {
    this.tune = tune;
    this.reset(seed);
  }

  reset(seed: number) {
    this.match = new Match(seed, [0], this.tune, { startOnHold: true });
    this.me = this.match.runners[0]!;
  }

  step(held: boolean) {
    this.match.step([held]);
  }

  drain() {
    return this.me.drain();
  }

  get seed() {
    return this.match.seed;
  }
  get fuel() {
    return this.me.fuel;
  }
  get state() {
    return this.me.state;
  }
  /** Tempo de jogo (s) desde o primeiro toque. */
  get t() {
    return this.match.track.t;
  }
  get ticks() {
    return this.match.ticks;
  }
  get x() {
    return this.me.x;
  }
  get y() {
    return this.me.y;
  }
  get vy() {
    return this.me.vy;
  }
  get speed() {
    return this.me.speed;
  }
  get thrusting() {
    return this.me.thrusting;
  }
  get fuelCollected() {
    return this.me.fuelCollected;
  }
  get pickupsTaken() {
    return this.me.pickupsTaken;
  }
  get passed() {
    return this.me.passed;
  }
  get phase() {
    return this.me.phase;
  }
  get smashed() {
    return this.me.smashed;
  }
  /** Fim do turbo (tempo de jogo, s). */
  get powerUntil() {
    return this.me.powerUntil;
  }
  get obstacles() {
    return this.match.track.obstacles;
  }
  get pickups() {
    return this.match.track.pickups;
  }
  get distance() {
    return this.me.distance;
  }
  get alive() {
    return this.me.alive;
  }
  /** Turbo ativo: bater num obstáculo quebra a peça em vez de matar. */
  get powered() {
    return this.me.poweredAt(this.t);
  }
  /** Segundos de turbo restantes. */
  get powerLeft() {
    return Math.max(0, this.me.powerUntil - this.t);
  }
}
