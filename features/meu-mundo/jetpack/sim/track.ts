// Percurso de uma partida (mm3d-21): seed, gerador, obstáculos, cápsulas e o
// que a partida mudou nele (peças quebradas, cápsulas pegas, turbos pegos).
// É o mesmo para todos os jogadores da partida; o jogador mora em runner.ts.
//
// Só TypeScript que pode ser apagado (sem enum, sem parameter properties): o
// teste do backend carrega este arquivo direto e confere o espelho em JS
// (freelandoo-backend/src/utils/meuMundoJetpack.js).

import { Generator, type Obstacle, type Pickup } from './generator';
import { TUNING, type Tuning } from './tuning';

export class Track {
  readonly tune: Tuning;
  seed = 1;
  /** Passos desde a largada (iguais para todos os jogadores). */
  ticks = 0;
  /** Tempo de jogo (s) desde a largada: move os obstáculos que oscilam. */
  t = 0;
  obstacles: Obstacle[] = [];
  pickups: Pickup[] = [];
  /** x dos turbos pegos, na ordem (refaz o percurso numa reconexão). */
  vulcans: number[] = [];
  private gen!: Generator;

  constructor(seed: number, tune: Tuning = TUNING) {
    this.tune = tune;
    this.reset(seed);
  }

  reset(seed: number) {
    for (const o of this.obstacles) this.gen?.recycle(o);
    for (const p of this.pickups) this.gen?.recyclePickup(p);
    this.obstacles.length = 0;
    this.pickups.length = 0;
    this.vulcans.length = 0;
    this.seed = seed;
    this.gen = new Generator(seed, this.tune);
    this.ticks = 0;
    this.t = 0;
    this.gen.fill(this.tune.lookahead, this.obstacles, this.pickups);
  }

  setTick(ticks: number) {
    this.ticks = ticks;
    this.t = ticks * this.tune.step;
  }

  /** Gera até xMax (a frente do líder + lookahead). */
  fillTo(xMax: number) {
    this.gen.fill(xMax, this.obstacles, this.pickups);
  }

  /** Recicla o que ficou antes de x (atrás da rabeira, fora da tela). */
  recycleBehind(x: number) {
    let w = 0;
    for (const o of this.obstacles) {
      if (o.x + o.w < x) this.gen.recycle(o);
      else this.obstacles[w++] = o;
    }
    this.obstacles.length = w;
    w = 0;
    for (const p of this.pickups) {
      if (p.x < x) this.gen.recyclePickup(p);
      else this.pickups[w++] = p;
    }
    this.pickups.length = w;
  }

  pickupById(id: number): Pickup | undefined {
    return this.pickups.find((p) => p.id === id);
  }

  obstacleById(id: number): Obstacle | undefined {
    return this.obstacles.find((o) => o.id === id);
  }

  /** Alguém pegou: some para todos; turbo empurra o próximo turbo do percurso. */
  take(p: Pickup) {
    p.taken = true;
    if (p.kind === 'vulcan') {
      this.gen.vulcanTaken(p.x);
      this.vulcans.push(p.x);
    }
  }

  breakPiece(obstacleId: number, piece: number) {
    const o = this.obstacleById(obstacleId);
    if (o) o.broken |= 1 << piece;
  }

  /**
   * Percurso igual ao de uma partida em andamento, só com a seed e os turbos
   * pegos (reconexão): gera em ordem e aplica cada turbo no ponto em que o
   * percurso já existia quando foi pego (o próximo turbo fica bem depois).
   */
  static rebuild(seed: number, vulcans: readonly number[], upTo: number, tune: Tuning = TUNING): Track {
    const tr = new Track(seed, tune);
    for (const x of vulcans) {
      tr.fillTo(x + tune.lookahead);
      tr.gen.vulcanTaken(x);
      tr.vulcans.push(x);
    }
    tr.fillTo(upTo);
    return tr;
  }
}
