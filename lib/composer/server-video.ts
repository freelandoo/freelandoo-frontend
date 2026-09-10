// lib/composer/server-video.ts
//
// Prepara um slide de VÍDEO para ser composto NO SERVIDOR: em vez de desenhar o
// clipe quadro a quadro num canvas e codificá-lo aqui, o aparelho entrega o
// ARQUIVO ORIGINAL, os parâmetros de enquadramento/cor e um PNG com o que foi
// desenhado por cima.
//
// ⚠️ POR QUE O CELULAR PAROU DE CODIFICAR: o caminho antigo dependia de
// WebCodecs/MediaRecorder do navegador. No iOS isso produzia buraco preto,
// quadro congelado e o erro de `decoderConfig`; e mesmo quando funcionava era a
// PRIMEIRA de duas codificações — o servidor recomprimia por cima —, então a
// qualidade já ia embora antes de o arquivo sair do aparelho, com teto de 720p.
// Aqui não há encoder nenhum: só um canvas 2D desenhando texto, que não
// decodifica vídeo e portanto não passa por nada do que quebrava.
//
// ⚠️ ISTO NÃO SERVE PARA IMAGEM. Foto continua sendo exportada localmente: é um
// render único, barato, e não sofre nenhum dos defeitos acima.

import { buildOverlayPng, overlaySize } from "./overlay-png"
import type { CropState, FilterState, MediaDraft, OverlayLayer, TextLayer } from "./types"

/** Parâmetros que o backend valida em `utils/composeParams.js`. */
export interface ServerComposeParams {
  aspect: number
  zoom: number
  panX: number
  panY: number
  filter: FilterState | null
  pip: { x: number; y: number; scale: number } | null
}

export interface ServerVideoJob {
  kind: "video"
  /** O arquivo do celular, cru. Nenhum byte foi recodificado. */
  source: File
  /** Texto, vinheta e PiP-imagem já rasterizados. `null` = nada a sobrepor. */
  overlayBlob: Blob | null
  /** PiP de VÍDEO — não cabe num PNG, então sobe como arquivo à parte. */
  pipFile: File | null
  params: ServerComposeParams
  /** Tamanho-alvo. O servidor pode entregar MENOR (nunca amplia). */
  width: number
  height: number
  durationSec: number
}

export interface PrepareServerVideoInput {
  draft: MediaDraft
  filter: FilterState
  crop: CropState
  textLayers: TextLayer[]
  overlay: OverlayLayer | null
}

export async function prepareServerVideo(p: PrepareServerVideoInput): Promise<ServerVideoJob> {
  const { w, h } = overlaySize(p.crop.aspect)

  const overlayBlob = await buildOverlayPng({
    aspect: p.crop.aspect,
    filter: p.filter,
    textLayers: p.textLayers,
    overlay: p.overlay,
  })

  // PiP de vídeo: recupera os bytes do object URL do descritor. O `File`
  // original não é guardado no slide (o descritor carrega só a URL), e buscar a
  // blob: de volta é mais barato que mudar a forma do estado por causa de um
  // caso de sobreposição.
  let pipFile: File | null = null
  let pip: ServerComposeParams["pip"] = null
  if (p.overlay?.kind === "video") {
    try {
      const blob = await (await fetch(p.overlay.url)).blob()
      pipFile = new File([blob], "pip.mp4", { type: blob.type || "video/mp4" })
      pip = { x: p.overlay.x, y: p.overlay.y, scale: p.overlay.scale }
    } catch {
      // Sobreposição perdida não pode impedir a publicação do vídeo principal.
      pipFile = null
      pip = null
    }
  }

  return {
    kind: "video",
    source: p.draft.file,
    overlayBlob,
    pipFile,
    params: {
      aspect: p.crop.aspect,
      zoom: p.crop.zoom,
      panX: p.crop.panX,
      panY: p.crop.panY,
      filter: p.filter,
      pip,
    },
    width: w,
    height: h,
    durationSec: Math.round(p.draft.durationSec || 0),
  }
}
