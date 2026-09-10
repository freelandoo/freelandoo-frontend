// lib/composer/overlay-png.ts
//
// Rasteriza, num PNG transparente, TUDO que é desenhado por cima do vídeo:
// vinheta, sobreposição de imagem e camadas de texto. O servidor aplica esse
// PNG com um `overlay` do ffmpeg num passe só.
//
// ⚠️ POR QUE UM PNG, E NÃO DEIXAR O SERVIDOR DESENHAR: o texto tem fonte,
// quebra de linha, caixa e sombra decididas pelo editor. Redesenhá-lo com
// `drawtext` do ffmpeg exigiria embarcar as fontes no container e reimplementar
// a mesma medição — duas réguas para a mesma caixa, divergindo na primeira
// linha que quebrasse diferente. Rasterizar no cliente é WYSIWYG por
// construção, e é BARATO: desenhar num canvas 2D não decodifica vídeo nenhum,
// então não passa por nada do que quebrava no iOS.
//
// ⚠️ PiP de VÍDEO NÃO ENTRA AQUI — ele se move, e um PNG é um quadro só. Esse
// caso sobe como arquivo à parte e o ffmpeg o compõe como segunda entrada.

import { drawTextLayers } from "./text-layer"
import { paintOverlay } from "./overlay-layer"
import type { CropState, FilterState, OverlayLayer, TextLayer } from "./types"

/** Lado curto da saída — espelha COMPOSE_SHORT_SIDE do backend
 *  (src/utils/mediaProcessing.js). O servidor reescala este PNG para o tamanho
 *  real do vídeo, então o que este número decide é a NITIDEZ do texto. */
export const OVERLAY_SHORT_SIDE = 1080

/** Espelho de `composeOutputSize` do backend: `base` é o LADO CURTO. */
export function overlaySize(aspect: number, base = OVERLAY_SHORT_SIDE): { w: number; h: number } {
  const even = (n: number) => {
    const r = Math.round(n)
    return r % 2 === 0 ? r : r - 1
  }
  const short = even(base)
  const w = aspect >= 1 ? even(base * aspect) : short
  const h = aspect >= 1 ? short : even(base / aspect)
  return { w: Math.max(2, w), h: Math.max(2, h) }
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/**
 * Pinta a vinheta do shader como preto com alfa.
 *
 * ⚠️ ISTO É EXATO, não uma imitação. O shader faz `col *= mix(1.0, vig, V)`, e
 * multiplicar por um fator `m` é o mesmo que compor PRETO por cima com alfa
 * `1 - m` (porque `col*(1-a) + 0*a === col*m` quando `a = 1-m`). É essa
 * identidade que permite tirar a vinheta da LUT — que só sabe cor→cor — sem
 * perder nada.
 *
 * ⚠️ E o degradê é desenhado NUM QUADRADO e depois ESTICADO: o shader mede
 * `distance(v_uv, 0.5)` em espaço UV, que é normalizado por eixo, então o
 * "círculo" é uma ELIPSE em pixels num canvas 1080x1920. Um radial gradient
 * direto no canvas final sairia redondo e a vinheta ficaria mais forte em cima
 * e embaixo do que o editor mostrou.
 */
function paintVignette(ctx: CanvasRenderingContext2D, W: number, H: number, strength: number) {
  if (!(strength > 0.001)) return
  const S = 256
  const g = document.createElement("canvas")
  g.width = S
  g.height = S
  const gc = g.getContext("2d")
  if (!gc) return

  const maxD = Math.SQRT1_2 // centro → canto, em UV
  const grad = gc.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, maxD * S)
  const STOPS = 24
  for (let i = 0; i <= STOPS; i++) {
    const f = i / STOPS
    // smoothstep(0.8, 0.4, d) — as bordas vêm INVERTIDAS no shader, então vale
    // 1 no centro e cai em direção às pontas.
    const vig = smoothstep(0.8, 0.4, f * maxD)
    grad.addColorStop(f, `rgba(0,0,0,${(strength * (1 - vig)).toFixed(4)})`)
  }
  gc.fillStyle = grad
  gc.fillRect(0, 0, S, S)
  ctx.drawImage(g, 0, 0, W, H)
}

export interface OverlayPngParams {
  aspect: CropState["aspect"]
  filter: FilterState
  textLayers: TextLayer[]
  /** Só entra no PNG quando for IMAGEM; vídeo sobe como arquivo à parte. */
  overlay: OverlayLayer | null
}

/**
 * Monta o PNG de sobreposição. Devolve `null` quando não há nada a desenhar —
 * e aí o servidor nem acrescenta o filtro de overlay ao grafo.
 */
export async function buildOverlayPng(p: OverlayPngParams): Promise<Blob | null> {
  const hasText = p.textLayers.some((l) => l.text.trim().length > 0)
  const hasImageOverlay = p.overlay?.kind === "image"
  const hasVignette = (p.filter?.vignette ?? 0) > 0.001
  if (!hasText && !hasImageOverlay && !hasVignette) return null

  const { w, h } = overlaySize(p.aspect)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // A ordem espelha a do editor: a vinheta é do shader (vem antes do blit) e o
  // PiP e o texto são do compositor 2D (vêm depois). Por isso o texto NÃO é
  // escurecido pela vinheta — nos dois lados.
  paintVignette(ctx, w, h, p.filter?.vignette ?? 0)

  if (hasImageOverlay && p.overlay) {
    const el = await loadOverlayImage(p.overlay.url)
    if (el) paintOverlay(ctx, w, h, p.overlay, el)
  }

  // ⚠️ Espera as fontes da casa antes de medir o texto: `Anton` e `Caveat`
  // chegam por CSS depois da montagem, e desenhar antes disso produziria a
  // quebra de linha da fonte de reserva — texto no lugar errado no arquivo
  // final, com o editor mostrando o certo.
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready
  } catch {
    /* noop */
  }
  drawTextLayers(ctx, w, h, p.textLayers)

  return new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"))
}

function loadOverlayImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image()
    im.crossOrigin = "anonymous"
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = url
  })
}
