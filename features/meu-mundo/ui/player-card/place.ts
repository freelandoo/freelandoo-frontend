// features/meu-mundo/ui/player-card/place.ts — onde o card de perfil (mm3d-31)
// aparece, sempre em 9:12 e AO LADO do boneco tocado.
//
// Computador: no lado do boneco que fica LONGE do centro da tela (lá está o
// seu próprio personagem; sem espaço, o outro lado), centrado na altura do
// corpo e dentro da janela. Nunca em cima do rosto: a folga lateral sai da
// largura do boneco na tela.
//
// Celular: o card encosta numa borda (a do lado oposto ao boneco no toque) e
// a câmera gira um pouco até o boneco ficar no meio da outra metade
// (`compactFrameX` → motor, player-select.ts). Acima dos controles de toque.

import type { ScreenBox } from "../../engine/player-select"

/** Celular: card menor encostado na borda (mesma régua das notificações). */
export const isCompactViewport = (w: number, h: number) => w < 760 || h < 520

export interface CardPlace {
  left: number
  top: number
}

const EDGE = 12
/** Abaixo do sino/caixa e da faixa da visita. */
const TOP_EDGE = 64
/** Celular: joystick e botão de ação ficam livres embaixo. */
const TOUCH_BOTTOM = 136

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

/** Celular: o card vai para a borda oposta ao boneco (boneco à esquerda → card à direita). */
export const compactCardRight = (box: ScreenBox | null, vw: number) => !box || box.x < vw / 2

/** Celular: onde a câmera põe o boneco (fração da largura) — no meio da metade livre. */
export const compactFrameX = (box: ScreenBox | null, vw: number) => (compactCardRight(box, vw) ? 0.27 : 0.73)

export function placeCompact(box: ScreenBox | null, w: number, h: number, vw: number, vh: number): CardPlace {
  const left = compactCardRight(box, vw) ? vw - w - EDGE : EDGE
  const bottom = vh - TOP_EDGE - TOUCH_BOTTOM >= h ? TOUCH_BOTTOM : EDGE
  const mid = box ? (box.top + box.bottom) / 2 : vh / 2
  return { left, top: Math.max(TOP_EDGE, Math.min(vh - h - bottom, mid - h / 2)) }
}
