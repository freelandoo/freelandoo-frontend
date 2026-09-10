// lib/composer/overlay-layer.ts
// Sobreposição PiP (imagem ou vídeo colado por cima da mídia principal).
//
// ⚠️ Isto saiu de dentro do MediaComposer porque agora é desenhado em DOIS
// lugares: no preview ao vivo e no PNG que vai para o servidor compor o vídeo.
// Escrito duas vezes, o PiP sairia numa posição no editor e noutra no arquivo
// publicado — e a diferença só apareceria depois de postado.

import type { OverlayLayer } from "./types"

/** Carrega o elemento (img/vídeo) de uma sobreposição a partir do descritor. */
export async function loadOverlayEl(
  desc: OverlayLayer | null
): Promise<HTMLImageElement | HTMLVideoElement | null> {
  if (!desc) return null
  if (desc.kind === "image") {
    return new Promise((res) => {
      const im = new Image()
      im.crossOrigin = "anonymous"
      im.onload = () => res(im)
      im.onerror = () => res(null)
      im.src = desc.url
    })
  }
  const v = document.createElement("video")
  v.src = desc.url
  v.muted = true
  v.loop = true
  v.playsInline = true
  v.crossOrigin = "anonymous"
  await new Promise<void>((res) => {
    v.onloadeddata = () => res()
    v.onerror = () => res()
  })
  await v.play().catch(() => {})
  return v
}

/** Desenha uma sobreposição PiP no canvas (mesma matemática do preview e do export). */
export function paintOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  desc: OverlayLayer | null,
  el: HTMLImageElement | HTMLVideoElement | null
) {
  if (!desc || !el) return
  const natW = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth
  const natH = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight
  if (!natW || !natH) return
  const w = desc.scale * W
  const h = w * (natH / natW)
  const x = desc.x * W - w / 2
  const y = desc.y * H - h / 2
  try {
    ctx.save()
    ctx.shadowColor = "rgba(0,0,0,0.5)"
    ctx.shadowBlur = w * 0.06
    ctx.shadowOffsetY = w * 0.03
    ctx.drawImage(el, x, y, w, h)
    ctx.restore()
    ctx.lineWidth = Math.max(2, w * 0.02)
    ctx.strokeStyle = "#F2B705"
    ctx.strokeRect(x, y, w, h)
  } catch {
    /* frame não decodável ainda */
  }
}
