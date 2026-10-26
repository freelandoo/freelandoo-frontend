// features/meu-mundo/avatar-colors.ts — cores do personagem (mm3d-36).
//
// Espelho da paleta de src/utils/meuMundoColors.js (teste de espelho no back)
// e a pintura da textura (`recolorPixels`, pura: o motor e o Jetpack usam).
// A máscara diz, por pixel, a região (0 nada, 1 camiseta, 2 calça, 3 pele,
// 4 cabelo); a cor nova sai da cor escolhida × (luz do pixel ÷ luz da
// referência da região), então dobras e sombras pintadas continuam.
// Sem imports: o teste do back carrega este arquivo direto.

export const PARTS = ["shirt", "pants", "skin", "hair"] as const
export type ColorPart = (typeof PARTS)[number]
export interface Swatch {
  id: string
  hex: string
}

const p = (list: [string, string][]): Swatch[] => list.map(([id, hex]) => ({ id, hex }))
export const PALETTE: Record<ColorPart, Swatch[]> = {
  shirt: p([["red", "#C8202E"], ["white", "#F2F2EE"], ["black", "#26262A"], ["gray", "#8A8D93"], ["navy", "#1F2F5C"], ["sky", "#6FB7E8"], ["green", "#1E8A4A"], ["mint", "#8FD9B6"], ["yellow", "#F2C230"], ["orange", "#F07A28"], ["pink", "#F08DB4"], ["purple", "#7B4FC0"]]),
  pants: p([["jeans", "#2B3F73"], ["lightJeans", "#6F8FBF"], ["black", "#24262B"], ["gray", "#7C7F86"], ["beige", "#CDB894"], ["brown", "#6B4A30"], ["olive", "#5E6B3A"], ["wine", "#6E1F33"], ["white", "#EDEDE8"], ["royal", "#2F5BD3"]]),
  skin: p([["s0", "#FBE3D3"], ["s1", "#F3CFB3"], ["s2", "#E8B48F"], ["s3", "#D9A27A"], ["s4", "#C08660"], ["s5", "#A06A45"], ["s6", "#7A4D31"], ["s7", "#4E3020"]]),
  hair: p([["black", "#1E1A18"], ["darkBrown", "#3B2418"], ["brown", "#6B3A22"], ["red", "#A8341C"], ["copper", "#B5622B"], ["darkBlonde", "#9C7A45"], ["blonde", "#E0C27A"], ["gray", "#B9B6B0"], ["pink", "#F07AAE"], ["blue", "#3F7BE0"], ["purple", "#8A55D6"], ["green", "#3FAE6A"]]),
}

/** Camiseta vermelha, jeans, pele do meio, cabelo castanho: as cores de sempre. */
export const DEFAULT_LOOK = "0032"

/** Skins que mudam de cor (Sergio e Ekaterina têm visual próprio). */
export const COLORABLE_SKINS: ReadonlySet<string> = new Set(["standard", "feminina"])

/** Índices na paleta (camiseta, calça, pele, cabelo); inválido = o padrão. */
export function parseLook(code: string | null | undefined): number[] {
  const s = String(code || "")
  if (!/^[0-9a-z]{4}$/.test(s)) return parseLook(DEFAULT_LOOK)
  const idx = [...s].map((ch) => parseInt(ch, 36))
  return idx.every((v, i) => v < PALETTE[PARTS[i]].length) ? idx : parseLook(DEFAULT_LOOK)
}

export const lookCode = (idx: number[]) => idx.map((v) => v.toString(36)).join("")

const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b

/** RGBA pintado (cópia). `mask` tem um byte por pixel (0–4); `refs` = cor medida de cada região na textura. */
export function recolorPixels(base: Uint8ClampedArray, mask: Uint8Array, refs: Record<ColorPart, number[]>, code: string): Uint8ClampedArray {
  const idx = parseLook(code)
  const target = PARTS.map((part, i) => hexRgb(PALETTE[part][idx[i]].hex))
  const refL = PARTS.map((part) => Math.max(1, lum(refs[part][0], refs[part][1], refs[part][2])))
  const out = new Uint8ClampedArray(base)
  for (let px = 0; px < mask.length; px++) {
    const k = mask[px]
    if (!k || k > 4) continue
    const o = px * 4
    const f = Math.min(1.6, lum(base[o], base[o + 1], base[o + 2]) / refL[k - 1])
    const t = target[k - 1]
    out[o] = t[0] * f
    out[o + 1] = t[1] * f
    out[o + 2] = t[2] * f
  }
  return out
}
