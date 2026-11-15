// features/meu-mundo/engine/avatar-tint.ts — textura pintada com as cores (mm3d-36).
//
// Carrega a textura do corpo, a máscara de regiões e as referências medidas
// (pipeline/build_color_masks.py) e devolve um canvas pintado por
// recolorPixels. Cache por (textura, look): 20 pessoas com cores diferentes =
// 20 canvases de 512² (1 MB cada). Código padrão = null (textura original).
// Sem Babylon: o Jetpack (three.js) usa o mesmo canvas.
import { DEFAULT_LOOK, lookCode, parseLook, recolorPixels, type ColorPart } from "../avatar-colors"
import type { BodyId } from "../types"

/** Máscara de cada corpo pintável (o magro usa a textura do normal). */
export const TINT_MASK: Partial<Record<BodyId, string>> = { normal: "normal", slim: "normal", fat: "fat", strong: "strong", female: "female" }

const loads = new Map<string, Promise<ImageData>>()
const tinted = new Map<string, Promise<HTMLCanvasElement>>()
// Limpeza 3 (2026-11-14): os dois caches tinham vida eterna (cada pessoa de cor diferente que passava
// deixava 1–4 MB de canvas para a sessão inteira). Agora a ordem do Map é a do último uso e o mais
// antigo sai acima do teto; quem já pegou o canvas (a textura da cena) continua com ele.
const MAX_TINTED = 24
const MAX_PIXELS = 12
function hit<T>(map: Map<string, T>, key: string): T | undefined {
  const v = map.get(key)
  if (v !== undefined) {
    map.delete(key)
    map.set(key, v)
  }
  return v
}
function put<T>(map: Map<string, T>, key: string, v: T, max: number) {
  map.set(key, v)
  while (map.size > max) {
    const first = map.keys().next().value
    if (first === undefined) break
    map.delete(first)
  }
}
let refsP: Promise<Record<string, Record<ColorPart, number[]>>> | null = null

function pixels(url: string): Promise<ImageData> {
  let p = hit(loads, url)
  if (!p) {
    p = new Promise<ImageData>((ok, fail) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const c = document.createElement("canvas")
        c.width = img.width
        c.height = img.height
        const g = c.getContext("2d", { willReadFrequently: true })
        if (!g) return fail(new Error("sem canvas 2d"))
        g.drawImage(img, 0, 0)
        ok(g.getImageData(0, 0, c.width, c.height))
      }
      img.onerror = () => fail(new Error(`não carregou ${url}`))
      img.src = url
    })
    p.catch(() => loads.delete(url))
    put(loads, url, p, MAX_PIXELS)
  }
  return p
}

/** Look que muda alguma coisa ("" e o padrão = textura original). */
export const isTinted = (look: string | null | undefined) => !!look && lookCode(parseLook(look)) !== DEFAULT_LOOK

/**
 * Canvas com a textura do corpo pintada; null = usar a textura original
 * (corpo sem máscara, como Sergio e Ekaterina, ou cores padrão).
 */
export function tintedTexture(base: string, texture: string, body: BodyId, look: string | null | undefined): Promise<HTMLCanvasElement> | null {
  const mask = TINT_MASK[body]
  if (!mask || !look || !isTinted(look)) return null
  const key = `${texture}|${look}`
  let p = hit(tinted, key)
  if (!p) {
    if (!refsP) {
      refsP = fetch(`${base}avatar-color-refs.json`).then((r) => {
        if (!r.ok) throw new Error(`refs ${r.status}`)
        return r.json()
      })
      refsP.catch(() => (refsP = null))
    }
    p = Promise.all([pixels(base + texture), pixels(`${base}avatar-${mask}-mask-512.png`), refsP]).then(([tex, m, refs]) => {
      const idx = new Uint8Array(m.width * m.height)
      for (let i = 0; i < idx.length; i++) idx[i] = m.data[i * 4]
      const out = recolorPixels(tex.data, idx, refs[mask], look)
      const c = document.createElement("canvas")
      c.width = tex.width
      c.height = tex.height
      const g = c.getContext("2d")
      if (!g) throw new Error("sem canvas 2d")
      g.putImageData(new ImageData(new Uint8ClampedArray(out), tex.width, tex.height), 0, 0)
      return c
    })
    p.catch(() => tinted.delete(key))
    put(tinted, key, p, MAX_TINTED)
  }
  return p
}
