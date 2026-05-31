// lib/composer/text-layer.ts
// Desenha as camadas de texto no canvas 2D (mesma função no preview e no export,
// garantindo WYSIWYG). Caixa arredondada com cor OU transparente (com sombra p/
// legibilidade). Posição/tamanho relativos ao canvas.

import { TEXT_FONTS, type TextLayer } from "./types"

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Quebra o texto em linhas que cabem em maxWidth. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split("\n")) {
    const words = para.split(" ")
    let line = ""
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line)
        line = w
      } else {
        line = test
      }
    }
    out.push(line)
  }
  return out
}

/** Desenha todas as camadas de texto no contexto (W×H = tamanho do canvas). */
export function drawTextLayers(ctx: CanvasRenderingContext2D, W: number, H: number, layers: TextLayer[]) {
  const minDim = Math.min(W, H)
  for (const layer of layers) {
    if (!layer.text.trim()) continue
    const fontSize = Math.max(12, Math.round(minDim * layer.size))
    const family = TEXT_FONTS[layer.font]?.canvas || "sans-serif"
    const weight = layer.font === "display" ? "400" : "700"
    ctx.font = `${weight} ${fontSize}px ${family}`
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const maxW = W * 0.86
    const lines = wrap(ctx, layer.text, maxW)
    const lineH = fontSize * 1.18
    const padX = fontSize * 0.5
    const padY = fontSize * 0.34
    const textW = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)))
    const boxW = textW + padX * 2
    const boxH = lines.length * lineH + padY * 2
    const cx = layer.x * W
    const cy = layer.y * H

    // caixa
    if (layer.box === "rounded") {
      ctx.fillStyle = layer.boxColor
      roundRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, fontSize * 0.34)
      ctx.fill()
      ctx.shadowColor = "transparent"
    } else {
      // transparente: sombra forte p/ legibilidade
      ctx.shadowColor = "rgba(0,0,0,0.65)"
      ctx.shadowBlur = fontSize * 0.32
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = fontSize * 0.06
    }

    // texto
    ctx.fillStyle = layer.color
    const startY = cy - boxH / 2 + padY + lineH / 2
    lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH))
    ctx.shadowColor = "transparent"
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0
  }
}

/** Bounding box aproximada de uma camada (em px do canvas), p/ hit-test do drag. */
export function layerBox(ctx: CanvasRenderingContext2D, W: number, H: number, layer: TextLayer) {
  const minDim = Math.min(W, H)
  const fontSize = Math.max(12, Math.round(minDim * layer.size))
  const family = TEXT_FONTS[layer.font]?.canvas || "sans-serif"
  ctx.font = `700 ${fontSize}px ${family}`
  const maxW = W * 0.86
  const lines = wrap(ctx, layer.text, maxW)
  const lineH = fontSize * 1.18
  const textW = Math.min(maxW, Math.max(1, ...lines.map((l) => ctx.measureText(l).width)))
  const boxW = textW + fontSize
  const boxH = lines.length * lineH + fontSize * 0.68
  return { x: layer.x * W - boxW / 2, y: layer.y * H - boxH / 2, w: boxW, h: boxH }
}
