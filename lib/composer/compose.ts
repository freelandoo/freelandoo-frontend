// lib/composer/compose.ts
// Export local do resultado final (visual QUEIMADO). Foto → WebP; vídeo → MP4 via
// StoryRecorder (mesmo pipeline da câmera). A música NÃO é queimada (vai como
// metadado no slice 5). Crop/zoom/filtro já aplicados pelo ComposerRenderer.

import { StoryRecorder, canvasToPoster, type RecordResult } from "@/lib/camera/recorder"
import { detectCapabilities, isH264EncodeSupported } from "@/lib/camera/capabilities"
import { ComposerRenderer } from "./renderer"
import type { ComposedResult, FilterState, CropState, MediaDraft } from "./types"
import { targetWidthFor } from "./types"

/** Calcula W×H de saída a partir do aspect (w/h) e largura-alvo, ambos pares. */
function outSize(aspect: number, baseW: number): { w: number; h: number } {
  const even = (n: number) => { const r = Math.round(n); return r % 2 === 0 ? r : r - 1 }
  const w = even(baseW)
  const h = even(baseW / aspect)
  return { w: Math.max(2, w), h: Math.max(2, h) }
}

/** Carrega um <img> a partir de um object URL. */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("Falha ao carregar a imagem."))
    img.crossOrigin = "anonymous"
    img.src = url
  })
}

export interface ComposeParams {
  draft: MediaDraft
  filter: FilterState
  crop: CropState
  /** Hook de overlays (texto/PiP) — desenhado por cima da cor (slices 2/3). */
  afterCompose?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  onProgress?: (frac: number) => void
}

/** Exporta FOTO: render único → WebP. */
async function composeImage(p: ComposeParams): Promise<ComposedResult> {
  const { w, h } = outSize(p.crop.aspect, targetWidthFor("post", "image"))
  const canvas = document.createElement("canvas")
  const renderer = new ComposerRenderer(canvas, p.filter, p.crop)
  renderer.setSize(w, h)
  renderer.afterCompose = p.afterCompose
  try {
    const img = await loadImage(p.draft.url)
    renderer.render(img)
    p.onProgress?.(0.5)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.9))
    if (!blob) throw new Error("Falha ao gerar a imagem.")
    p.onProgress?.(1)
    return { blob, kind: "image", width: w, height: h, durationSec: 0, posterBlob: blob, encoder: "image" }
  } finally {
    renderer.dispose()
  }
}

/** Exporta VÍDEO: play do <video> importado → loop de render → StoryRecorder. */
async function composeVideo(p: ComposeParams): Promise<ComposedResult> {
  const caps = detectCapabilities()
  let path = caps.recordPath
  const { w, h } = outSize(p.crop.aspect, targetWidthFor("bee", "video"))
  if (path === "webcodecs") {
    const ok = await isH264EncodeSupported(w, h)
    if (!ok) path = caps.mediaRecorderMp4 ? "mediarecorder" : "none"
  }
  if (path === "none") throw new Error("Este navegador não suporta exportar vídeo. Tente outro.")

  const video = document.createElement("video")
  video.src = p.draft.url
  video.muted = true
  video.playsInline = true
  video.crossOrigin = "anonymous"
  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res()
    video.onerror = () => rej(new Error("Falha ao ler o vídeo."))
  })

  const canvas = document.createElement("canvas")
  const renderer = new ComposerRenderer(canvas, p.filter, p.crop)
  renderer.setSize(w, h)
  renderer.afterCompose = p.afterCompose

  const rec = new StoryRecorder({ getCanvas: () => canvas, audioTrack: null, width: w, height: h, path })
  let raf = 0
  const totalSec = Math.min(60, video.duration || 60)

  try {
    await rec.start()
    await video.play().catch(() => {})
    await new Promise<void>((resolve) => {
      const loop = () => {
        if (video.readyState >= 2) {
          renderer.render(video)
          rec.captureVideoFrame()
        }
        const t = video.currentTime
        p.onProgress?.(Math.min(0.9, (t / totalSec) * 0.9))
        if (video.ended || t >= totalSec) { resolve(); return }
        raf = requestAnimationFrame(loop)
      }
      raf = requestAnimationFrame(loop)
    })
    cancelAnimationFrame(raf)
    const res: RecordResult = await rec.stop()
    const poster = await canvasToPoster(canvas)
    p.onProgress?.(1)
    return {
      blob: res.blob, kind: "video", width: res.width, height: res.height,
      durationSec: Math.min(60, Math.round(totalSec)), posterBlob: poster, encoder: res.encoder,
    }
  } catch (err) {
    cancelAnimationFrame(raf)
    try { rec.cancel() } catch { /* noop */ }
    throw err
  } finally {
    renderer.dispose()
    video.pause()
    video.src = ""
  }
}

export async function compose(p: ComposeParams): Promise<ComposedResult> {
  return p.draft.kind === "image" ? composeImage(p) : composeVideo(p)
}
