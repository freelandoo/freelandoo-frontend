// features/meu-mundo/ui/player-card/place.ts — onde o card de perfil (mm3d-31)
// aparece no computador: AO LADO do boneco tocado, no lado que fica LONGE do
// centro da tela (lá está o seu próprio personagem; sem espaço, o outro lado),
// centrado na altura do corpo e sempre dentro da janela. Nunca em cima do
// rosto: a folga lateral sai da largura do boneco na tela.
//
// No celular o card é inferior e compacto (não passa por aqui).

import type { ScreenBox } from "../../engine/player-select"

/** Celular: card inferior compacto (mesma régua das notificações). */
export const isCompactViewport = (w: number, h: number) => w < 760 || h < 520

export interface CardPlace {
  left: number
  top: number
}

const EDGE = 12
/** Abaixo do sino/caixa e da faixa da visita. */
const TOP_EDGE = 64

export function placeCard(box: ScreenBox | null, w: number, h: number, vw: number, vh: number): CardPlace {
  const clampX = (x: number) => Math.max(EDGE, Math.min(vw - w - EDGE, x))
  const clampY = (y: number) => Math.max(TOP_EDGE, Math.min(vh - h - EDGE, y))
  if (!box) return { left: clampX(vw - w - 24), top: clampY((vh - h) / 2) }
  const half = Math.max(28, (box.bottom - box.top) * 0.32)
  const gap = 18
  const right = box.x + half + gap
  const left = box.x - half - gap - w
  const fitsRight = right + w <= vw - EDGE
  const fitsLeft = left >= EDGE
  const outward = box.x < vw / 2 ? (fitsLeft ? left : right) : fitsRight ? right : left
  return { left: clampX(outward), top: clampY((box.top + box.bottom) / 2 - h / 2) }
}
