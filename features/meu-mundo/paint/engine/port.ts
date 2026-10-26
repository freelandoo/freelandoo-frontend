// features/meu-mundo/paint/engine/port.ts — PAINT (mm3d-35): a porta da partida.
//
// A cena não sabe se a partida está no aparelho (treino) ou na sala
// (multiplayer): fala com uma PORTA. Ela guarda o estado num `PaintMatch`
// (no treino é a autoridade; na rede é a cópia que a sala vai preenchendo) e
// devolve os acontecimentos no mesmo formato (`MatchEvent`).

import { PaintMatch, type MatchEvent, type PaintPose } from "../sim/match"
import type { PaintColor, PaintMode } from "../sim/tuning"
import type { Vec3 } from "../sim/map"
import type { BodyId } from "../../types"

/** Pose de outro jogador com a hora (performance.now) em que chegou. */
export interface RemoteSample {
  t: number
  x: number
  y: number
  z: number
  f: number
  g: boolean
}

export interface PortPlayerInfo {
  name: string
  body: BodyId
}

export interface PaintPort {
  /** Minha vaga. */
  readonly me: number
  readonly mode: PaintMode
  /** Estado da partida (autoridade no treino, cópia na rede). */
  readonly state: PaintMatch
  /** Nome e corpo dos outros (rede). */
  info(slot: number): PortPlayerInfo | null
  pose(p: PaintPose): void
  fire(c: PaintColor, o: Vec3, dir: Vec3, q: number): void
  punch(): void
  /** Avança o relógio e devolve o que aconteceu. */
  tick(dt: number): MatchEvent[]
  /** Poses dos outros (rede): vaga → amostras recentes. */
  readonly samples?: Map<number, RemoteSample[]>
  /** A rede prevê a tinta: mancha local até a sala confirmar (id negativo). */
  readonly predicts: boolean
  dispose(): void
}

/** Treino: a regra inteira roda aqui, sem sala. */
export class LocalPort implements PaintPort {
  readonly me = 0
  readonly mode: PaintMode = "solo"
  readonly state: PaintMatch
  readonly predicts = false

  constructor() {
    this.state = new PaintMatch("solo", [{ slot: 0, team: 0, sit: 0 }])
  }

  info() {
    return null
  }

  pose(p: PaintPose) {
    this.state.pose(this.me, p)
  }

  fire(c: PaintColor, o: Vec3, dir: Vec3, q: number) {
    this.state.fire(this.me, c, o, dir, q)
  }

  punch() {
    this.state.punch(this.me)
  }

  tick(dt: number) {
    this.state.tick(dt)
    return this.state.drain()
  }

  dispose() {}
}
