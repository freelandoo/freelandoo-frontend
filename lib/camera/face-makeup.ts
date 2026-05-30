// lib/camera/face-makeup.ts
// Maquiagem básica desenhada no compositor 2D: batom (contorno dos lábios com
// multiply) e blush (gradiente radial nas bochechas). A suavização de pele é
// feita no shader (renderer). Tudo a partir dos landmarks do MediaPipe — nada
// sai do dispositivo.

import { MakeupState } from "./types"

// Contorno EXTERNO dos lábios (loop fechado).
export const LIP_OUTER = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
  375, 321, 405, 314, 17, 84, 181, 91, 146,
]
// Contorno INTERNO (abertura da boca) — subtraído p/ não pintar dentes/língua.
export const LIP_INNER = [
  78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308,
  324, 318, 402, 317, 14, 87, 178, 88, 95,
]
// Maçãs do rosto (blush).
export const CHEEK_LEFT = 50
export const CHEEK_RIGHT = 280

type Px = { x: number; y: number }
type GetPx = (index: number) => Px

function pathFrom(ctx: CanvasRenderingContext2D, indices: number[], get: GetPx) {
  indices.forEach((idx, i) => {
    const p = get(idx)
    if (i === 0) ctx.moveTo(p.x, p.y)
    else ctx.lineTo(p.x, p.y)
  })
  ctx.closePath()
}

/** Desenha batom + blush no canvas. `get` mapeia índice do mesh → px do canvas. */
export function drawMakeup(
  ctx: CanvasRenderingContext2D,
  makeup: MakeupState,
  get: GetPx,
  faceWidth: number
) {
  // ─── batom (cor/opacidade/blur controlados por régua) ──────────────────────
  if (makeup.lipstick > 0) {
    ctx.save()
    if (makeup.lipBlur > 0) {
      ctx.filter = `blur(${makeup.lipBlur * faceWidth * 0.03}px)`
    }
    ctx.beginPath()
    pathFrom(ctx, LIP_OUTER, get)
    pathFrom(ctx, LIP_INNER, get)
    ctx.globalCompositeOperation = "multiply"
    ctx.globalAlpha = Math.min(0.9, makeup.lipstick)
    ctx.fillStyle = makeup.lipColor
    ctx.fill("evenodd")
    ctx.restore()
  }

  // ─── blush (cor/opacidade/blur controlados por régua) ──────────────────────
  if (makeup.blush > 0) {
    const r = faceWidth * 0.2
    const alpha = Math.min(0.85, makeup.blush)
    for (const idx of [CHEEK_LEFT, CHEEK_RIGHT]) {
      const c = get(idx)
      const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r)
      grad.addColorStop(0, hexToRgba(makeup.blushColor, alpha))
      grad.addColorStop(1, hexToRgba(makeup.blushColor, 0))
      ctx.save()
      if (makeup.blushBlur > 0) {
        ctx.filter = `blur(${makeup.blushBlur * faceWidth * 0.04}px)`
      }
      ctx.globalCompositeOperation = "multiply"
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }
}

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
