// lib/composer/compose.ts
// Export local do resultado final (visual QUEIMADO) — HOJE, SÓ FOTO.
// Crop/zoom/filtro já aplicados pelo ComposerRenderer. A música NÃO é queimada
// (vai como metadado).
//
// ⚠️ O CAMINHO DE VÍDEO FOI REMOVIDO DAQUI, e isso é a entrega, não uma
// simplificação. Ele desenhava o clipe quadro a quadro num canvas e o
// codificava com WebCodecs/MediaRecorder do navegador. No iOS isso produzia
// buraco preto no meio do vídeo, quadro congelado no fim e o erro
// `t.info.decoderConfig.colorSpace` na cara de quem publicava — já com a mídia
// editada e o post preenchido. E mesmo quando funcionava era a PRIMEIRA de DUAS
// codificações (o servidor recomprimia por cima), então a qualidade ia embora
// antes de o arquivo sair do aparelho, com teto de 720p.
//
// Agora o vídeo sobe CRU e quem compõe é o servidor: ver
// `lib/composer/server-video.ts` (prepara) e, no backend,
// `utils/mediaProcessing.composeVideoFromFile` (compõe num passe de ffmpeg).
//
// ⚠️ NÃO RECRIAR O ENCODER AQUI. Se um dia parecer necessário compor vídeo no
// cliente, o problema é outro — este caminho foi apagado por não ser confiável
// em Safari, e a lição está paga.
//
// O `StoryRecorder` continua existindo e sendo usado pela CÂMERA AO VIVO
// (`components/camera/CameraStudio.tsx`), que é outro caso: lá não há arquivo
// de origem para mandar ao servidor — o vídeo nasce da webcam.

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

export interface ComposeParams {
  draft: MediaDraft
  filter: FilterState
  crop: CropState
  /** Hook de overlays (texto/PiP) — desenhado por cima da cor. */
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
    return { blob, kind: "image", width: w, height: h, durationSec: 0, posterBlob: blob, encoder: "image", mimeType: "image/webp" }
  } finally {
    renderer.dispose()
  }
}

/**
 * Exporta o slide localmente. **Só aceita FOTO.**
 *
 * ⚠️ Vídeo cai aqui como ERRO, e não em silêncio: quem publica vídeo tem que
 * passar por `prepareServerVideo`. Um fallback silencioso reintroduziria
 * exatamente o caminho que quebrava no Safari.
 */
export async function compose(p: ComposeParams): Promise<ComposedResult> {
  if (p.draft.kind !== "image") {
    throw new Error(
      "compose() é só para foto — vídeo é composto no servidor (ver lib/composer/server-video.ts)."
    )
  }
  return composeImage(p)
}
