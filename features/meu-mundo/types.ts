// features/meu-mundo/types.ts
//
// Contrato do bairro do Meu Mundo 3D. É exatamente a forma que o servidor
// devolve (`GET /meu-mundo/admin/neighborhood`, hoje um bairro
// demonstrativo). A entrega do bairro persistente troca a FONTE desses dados,
// não a forma — por isso nada aqui é desenho: posição e orientação dos lotes
// vêm do servidor, ruas e casas são desenhadas pelo cliente a partir do layout.

export type Vec2 = { x: number; z: number }

export interface Lot {
  /** Estável: "lot-01" … "lot-20". */
  id: string
  number: number
  side: "north" | "east" | "south" | "west"
  position: Vec2
  /** A FRENTE da casa é o -Z local; esta rotação a vira para a rua. */
  rotationY: number
  width: number
  depth: number
  houseId: string
}

export interface House {
  /** Estável: "house-01" … "house-20". */
  id: string
  lotId: string
  level: number
  /** Variação visual estável (cores e detalhes). */
  variant: number
  /** Dono real. Nesta etapa é sempre null: o bairro é demonstrativo. */
  ownerId: string | null
}

export interface Neighborhood {
  id: string
  name: string
  layout: "ring-20"
  capacity: number
  lots: Lot[]
  houses: House[]
  spawn: Vec2 & { rotationY: number }
  exit: Vec2 & { id: string; label: string }
}

export interface NeighborhoodPayload {
  release: string
  demo: boolean
  neighborhood: Neighborhood
}

/** O que o jogador pode acionar quando está perto. */
export type Interactable =
  | { kind: "house"; id: string; x: number; z: number; radius: number; lot: Lot; house: House }
  | { kind: "exit"; id: string; x: number; z: number; radius: number; label: string }

export interface GameStats {
  fps: number
  frameMs: number | null
  meshes: number
  activeMeshes: number
  materials: number
  drawCalls: number | null
  webgl: number
  liveGames: number
  /** Posição do personagem (metros). */
  x: number
  z: number
}
