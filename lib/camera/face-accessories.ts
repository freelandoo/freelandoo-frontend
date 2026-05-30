// lib/camera/face-accessories.ts
// Acessórios de rosto desenhados PROCEDURALMENTE (vetor no canvas 2D) — sem
// assets de imagem, zero risco de licença. Recebem pontos já em px do canvas.

import { AccessoryType, BRAND_YELLOW } from "./types"

export interface FaceGeomPx {
  leftEye: { x: number; y: number }
  rightEye: { x: number; y: number }
  forehead: { x: number; y: number }
  chin: { x: number; y: number }
  leftCheek: { x: number; y: number }
  rightCheek: { x: number; y: number }
  noseTip: { x: number; y: number }
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

export function drawAccessory(ctx: CanvasRenderingContext2D, type: AccessoryType, g: FaceGeomPx) {
  if (type === "none") return
  // Ordena os olhos por X p/ o ângulo ficar correto MESMO com câmera frontal
  // espelhada (senão dx fica negativo, roll ~180° e o acessório vira de cabeça p/ baixo).
  const eL = g.leftEye.x <= g.rightEye.x ? g.leftEye : g.rightEye
  const eR = g.leftEye.x <= g.rightEye.x ? g.rightEye : g.leftEye
  const eyeMid = { x: (eL.x + eR.x) / 2, y: (eL.y + eR.y) / 2 }
  const roll = Math.atan2(eR.y - eL.y, eR.x - eL.x)
  const eyeDist = dist(eL, eR)
  const faceWidth = dist(g.leftCheek, g.rightCheek)
  if (!eyeDist || !faceWidth) return

  switch (type) {
    case "glasses":
      drawGlasses(ctx, eyeMid, roll, eyeDist, false)
      break
    case "sunglasses":
      drawGlasses(ctx, eyeMid, roll, eyeDist, true)
      break
    case "crown":
      drawCrown(ctx, g.forehead, roll, faceWidth)
      break
    case "hat":
      drawHat(ctx, g.forehead, roll, faceWidth)
      break
  }
}

function drawGlasses(
  ctx: CanvasRenderingContext2D,
  center: { x: number; y: number },
  roll: number,
  eyeDist: number,
  dark: boolean
) {
  const r = eyeDist * 0.42
  const half = eyeDist / 2
  const lw = Math.max(2, eyeDist * 0.07)
  ctx.save()
  ctx.translate(center.x, center.y)
  ctx.rotate(roll)
  ctx.lineWidth = lw
  ctx.strokeStyle = "#0a0a0a"
  ctx.lineJoin = "round"

  const lens = (cx: number) => {
    ctx.beginPath()
    // lente levemente achatada
    ctx.ellipse(cx, 0, r, r * 0.85, 0, 0, Math.PI * 2)
    if (dark) {
      ctx.fillStyle = "rgba(10,10,12,0.82)"
      ctx.fill()
      // brilho
      ctx.save()
      ctx.clip()
      ctx.fillStyle = "rgba(255,255,255,0.18)"
      ctx.fillRect(cx - r, -r, r * 0.8, r * 0.8)
      ctx.restore()
    }
    ctx.stroke()
  }
  lens(-half)
  lens(half)

  // ponte
  ctx.beginPath()
  ctx.moveTo(-half + r * 0.7, 0)
  ctx.lineTo(half - r * 0.7, 0)
  ctx.stroke()

  // hastes
  ctx.beginPath()
  ctx.moveTo(-half - r, -r * 0.1)
  ctx.lineTo(-half - r * 1.8, -r * 0.5)
  ctx.moveTo(half + r, -r * 0.1)
  ctx.lineTo(half + r * 1.8, -r * 0.5)
  ctx.stroke()
  ctx.restore()
}

function drawCrown(
  ctx: CanvasRenderingContext2D,
  forehead: { x: number; y: number },
  roll: number,
  faceWidth: number
) {
  const w = faceWidth * 1.02
  const h = faceWidth * 0.5
  const baseY = -faceWidth * 0.12 // sobe um pouco acima da testa
  ctx.save()
  ctx.translate(forehead.x, forehead.y)
  ctx.rotate(roll)
  ctx.fillStyle = BRAND_YELLOW
  ctx.strokeStyle = "#a16207"
  ctx.lineWidth = Math.max(1.5, faceWidth * 0.012)

  const left = -w / 2
  const right = w / 2
  const band = h * 0.32
  const peaks = 5
  ctx.beginPath()
  ctx.moveTo(left, baseY)
  for (let i = 0; i < peaks; i++) {
    const x0 = left + (w * i) / peaks
    const x1 = left + (w * (i + 0.5)) / peaks
    const x2 = left + (w * (i + 1)) / peaks
    ctx.lineTo(x0, baseY - band)
    ctx.lineTo(x1, baseY - h)
    ctx.lineTo(x2, baseY - band)
  }
  ctx.lineTo(right, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // joias nas pontas
  ctx.fillStyle = "#dc2626"
  for (let i = 0; i < peaks; i++) {
    const x1 = left + (w * (i + 0.5)) / peaks
    ctx.beginPath()
    ctx.arc(x1, baseY - h + band * 0.2, faceWidth * 0.03, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  forehead: { x: number; y: number },
  roll: number,
  faceWidth: number
) {
  const baseW = faceWidth * 0.82
  const apexY = -faceWidth * 1.15
  const baseY = -faceWidth * 0.15
  ctx.save()
  ctx.translate(forehead.x, forehead.y)
  ctx.rotate(roll)

  // cone
  ctx.beginPath()
  ctx.moveTo(-baseW / 2, baseY)
  ctx.lineTo(baseW / 2, baseY)
  ctx.lineTo(0, apexY)
  ctx.closePath()
  ctx.fillStyle = BRAND_YELLOW
  ctx.fill()
  ctx.strokeStyle = "#a16207"
  ctx.lineWidth = Math.max(1.5, faceWidth * 0.012)
  ctx.stroke()

  // listras
  ctx.strokeStyle = "rgba(0,0,0,0.25)"
  ctx.lineWidth = faceWidth * 0.03
  for (let i = 1; i <= 2; i++) {
    const t = i / 3
    const y = baseY + (apexY - baseY) * t
    const hw = (baseW / 2) * (1 - t)
    ctx.beginPath()
    ctx.moveTo(-hw, y)
    ctx.lineTo(hw, y)
    ctx.stroke()
  }

  // pompom
  ctx.beginPath()
  ctx.arc(0, apexY, faceWidth * 0.07, 0, Math.PI * 2)
  ctx.fillStyle = "#fff"
  ctx.fill()
  ctx.restore()
}
