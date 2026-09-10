// lib/composer/compose.ts
// Export local do resultado final (visual QUEIMADO). Foto → WebP; vídeo → MP4 via
// StoryRecorder (mesmo pipeline da câmera). A música NÃO é queimada (vai como
// metadado no slice 5). Crop/zoom/filtro já aplicados pelo ComposerRenderer.

import { StoryRecorder, canvasToPoster, VideoCaptureError, type RecordResult } from "@/lib/camera/recorder"
import { detectCapabilities, isH264EncodeSupported, type RecordPath } from "@/lib/camera/capabilities"
import { ComposerRenderer } from "./renderer"
import type { ComposedResult, FilterState, CropState, MediaDraft } from "./types"
import { targetWidthFor } from "./types"

/** Calcula W×H de saída a partir do aspect (w/h), ambos pares.
 *  `base` é o LADO CURTO, não a largura: assim 4:5 sai 1080×1350, 1:1 sai
 *  1080×1080 e 16:9 sai 1920×1080 — as três com a mesma densidade. Fixando a
 *  largura, o 16:9 sairia 1080×608 e ficaria visivelmente mais mole que os
 *  outros dois no mesmo feed. */
function outSize(aspect: number, base: number): { w: number; h: number } {
  const even = (n: number) => { const r = Math.round(n); return r % 2 === 0 ? r : r - 1 }
  const short = even(base)
  const w = aspect >= 1 ? even(base * aspect) : short
  const h = aspect >= 1 ? short : even(base / aspect)
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

/** Resolve quando `cond()` for verdadeiro ou após `timeoutMs` (o que vier antes). */
function waitFor(cond: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (cond()) { resolve(); return }
    const start = performance.now()
    const tick = () => {
      if (cond() || performance.now() - start > timeoutMs) { resolve(); return }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

export interface ComposeParams {
  draft: MediaDraft
  filter: FilterState
  crop: CropState
  /** Hook de overlays (texto/PiP) — desenhado por cima da cor (slices 2/3). */
  afterCompose?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  /** Permite fallback WebM em superfícies que aceitam esse formato (Post/Bee). */
  allowWebmFallback?: boolean
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
    return { blob, kind: "image", width: w, height: h, durationSec: 0, posterBlob: blob, encoder: "image", mimeType: "image/webp" }
  } finally {
    renderer.dispose()
  }
}

/** Caminhos de gravação que este navegador aceita, na ordem de preferência.
 *  Devolver uma LISTA (e não um caminho só) é o que permite cair para o
 *  MediaRecorder quando o WebCodecs aceita os frames e não produz vídeo — o que
 *  acontece no iOS e terminava como "decoderConfig.colorSpace" na cara do
 *  usuário, já com a mídia editada e o post preenchido. */
async function recordPathsFor(w: number, h: number, allowWebm: boolean): Promise<RecordPath[]> {
  const caps = detectCapabilities()
  const paths: RecordPath[] = []
  if (caps.recordPath === "webcodecs" && (await isH264EncodeSupported(w, h))) paths.push("webcodecs")
  if (caps.mediaRecorder && (caps.mediaRecorderMp4 || (allowWebm && caps.mediaRecorderWebm))) paths.push("mediarecorder")
  return paths
}

/** Uma tentativa de export: play do <video> importado → loop de render → StoryRecorder. */
async function composeVideoPass(p: ComposeParams, path: RecordPath): Promise<ComposedResult> {
  const { w, h } = outSize(p.crop.aspect, targetWidthFor("bee", "video"))

  const video = document.createElement("video")
  video.src = p.draft.url
  video.muted = true
  video.playsInline = true
  video.crossOrigin = "anonymous"
  video.preload = "auto"
  // iOS/WebKit só decodifica frames de forma confiável com o <video> no DOM.
  // Mantém invisível (1×1, fora da viewport) e remove no finally.
  video.setAttribute("muted", "")
  video.setAttribute("playsinline", "")
  video.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none"
  document.body.appendChild(video)
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
  // Duração robusta: alguns MP4/MOV de celular reportam duration NaN/Infinity/0.
  const dur = video.duration
  const totalSec =
    Number.isFinite(dur) && dur > 0 ? Math.min(60, dur) : Math.min(60, p.draft.durationSec || 60)

  try {
    await rec.start()
    // iOS/Safari: um <video> começa em readyState 1; se o loop capturar antes de
    // HAVE_CURRENT_DATA, zero frames são codificados e o mp4-muxer quebra ao
    // finalizar. Espera dados decodificáveis antes de gravar.
    if (video.readyState < 2) {
      try { video.currentTime = Math.min(0.05, totalSec / 2) } catch { /* noop */ }
    }
    await waitFor(() => video.readyState >= 2, 5000)
    await video.play().catch(() => {})
    const startWall = performance.now()
    let lastT = -1
    let stalled = 0
    let everReady = false
    await new Promise<void>((resolve) => {
      const loop = () => {
        if (video.readyState >= 2) {
          everReady = true
          renderer.render(video)
          rec.captureVideoFrame()
        }
        const t = video.currentTime
        p.onProgress?.(Math.min(0.9, (t / totalSec) * 0.9))
        // Playback travado (comum no iOS): empurra o tempo manualmente para
        // forçar a decodificação dos próximos frames.
        if (Math.abs(t - lastT) < 1e-3) {
          if (++stalled > 6) { try { video.currentTime = Math.min(totalSec, t + 1 / 30) } catch { /* noop */ } ; stalled = 0 }
        } else {
          stalled = 0
        }
        lastT = t
        const wallSec = (performance.now() - startWall) / 1000
        const reachedEnd = video.ended || t >= totalSec - 0.05
        const timedOut = wallSec > totalSec + 10
        // O vídeo não decodificou NENHUMA vez em 6s: não vai decodificar. Desiste
        // cedo para o chamador tentar o próximo caminho, em vez de segurar a tela
        // de "Renderizando" pela duração inteira do clipe. Mede "nunca esteve
        // pronto" — e não `encodedFrames`, que só o webcodecs alimenta.
        const deadEarly = wallSec > 6 && !everReady
        // No caminho webcodecs, nunca finaliza sem ter codificado ao menos 1
        // frame (evita decoderConfig null no mux). O mediarecorder captura via
        // captureStream e não usa encodedFrames, então só depende de reachedEnd.
        const hasFrames = path !== "webcodecs" || rec.encodedFrames > 0
        if ((reachedEnd && hasFrames) || timedOut || deadEarly) { resolve(); return }
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
      durationSec: Math.min(60, Math.round(totalSec)), posterBlob: poster, encoder: res.encoder, mimeType: res.mimeType,
    }
  } catch (err) {
    cancelAnimationFrame(raf)
    try { rec.cancel() } catch { /* noop */ }
    throw err
  } finally {
    renderer.dispose()
    video.pause()
    video.removeAttribute("src")
    try { video.load() } catch { /* noop */ }
    video.remove()
  }
}

/** Exporta VÍDEO tentando cada caminho suportado até um produzir arquivo. */
async function composeVideo(p: ComposeParams): Promise<ComposedResult> {
  const { w, h } = outSize(p.crop.aspect, targetWidthFor("bee", "video"))
  const paths = await recordPathsFor(w, h, !!p.allowWebmFallback)
  if (paths.length === 0) throw new Error("Este navegador não suporta exportar vídeo. Tente outro.")

  let lastErr: unknown = null
  for (let i = 0; i < paths.length; i++) {
    try {
      return await composeVideoPass(p, paths[i])
    } catch (err) {
      lastErr = err
      // Só falha de CAPTURA justifica tentar outro caminho: erro de leitura do
      // arquivo aconteceria de novo, e insistir só faria a espera dobrar.
      const retryable = err instanceof VideoCaptureError
      if (!retryable) throw err
      if (i === paths.length - 1) {
        // Acabaram os caminhos: fala do ARQUIVO e do que fazer, não do encoder.
        throw new Error("Não consegui exportar este vídeo neste navegador. Tente um trecho mais curto ou outro arquivo.")
      }
      p.onProgress?.(0)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Falha ao exportar o vídeo.")
}

export async function compose(p: ComposeParams): Promise<ComposedResult> {
  return p.draft.kind === "image" ? composeImage(p) : composeVideo(p)
}
