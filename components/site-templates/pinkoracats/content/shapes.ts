// OS FORMATOS DE UNHA — as categorias do leque do herói e o filtro do catálogo.
//
// ⚠️ O FORMATO DE UM PRODUTO SAI DO QUE A TAIZ ESCREVEU, nunca de sorteio.
// O desenho do placeholder (`product.shape`) é escolhido pelo id quando ela
// não disse nada — serve para a vitrine não ficar vazia, mas NÃO é dado.
// Filtrar categoria por ele mostraria produtos aleatórios sob "Stiletto".
// Quem decide a categoria é a linha "• Formato …" da descrição do produto
// na Loja (é a mesma linha que o site já mostra nos detalhes). Produto sem
// essa linha não entra em categoria nenhuma — e aparece em "Todos".
//
// Formato novo = uma entrada aqui (e, se precisar de desenho próprio, o
// caminho em `nail.tsx`).

import type { NailShape } from "./products.mock"

export type ShapeSlug = "stiletto" | "almond" | "quadrada" | "duck" | "garra"

export type ShapeCat = {
  slug: ShapeSlug
  label: string
  /** o desenho da unha que representa a categoria */
  draw: NailShape
  /** cores da unha no leque */
  tint: [string, string]
  /** reconhece a categoria no texto da Loja (sem acento, minúsculo) */
  match: RegExp
}

export const SHAPE_CATS: ShapeCat[] = [
  { slug: "stiletto", label: "Stiletto", draw: "stiletto", tint: ["#1c1d21", "#d42f42"], match: /stiletto/ },
  { slug: "almond", label: "Almond", draw: "almond", tint: ["#d42f42", "#f5f6f8"], match: /almond|amendoad/ },
  { slug: "quadrada", label: "Quadrada", draw: "square", tint: ["#c9cacd", "#1c1d21"], match: /quadrad|square/ },
  { slug: "duck", label: "Duck nails", draw: "duck", tint: ["#a81f2e", "#ff9aa0"], match: /\bduck|pato/ },
  { slug: "garra", label: "Garras", draw: "claw", tint: ["#2a2b30", "#c9cacd"], match: /garra|claw/ },
]

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/** O formato declarado nos detalhes ("Formato stiletto longo"), ou `null`. */
export function declaredShape(details: string[]): ShapeSlug | null {
  for (const line of details) {
    const l = norm(line)
    if (!l.startsWith("formato")) continue
    const cat = SHAPE_CATS.find((c) => c.match.test(l))
    if (cat) return cat.slug
  }
  return null
}

export function shapeCat(slug: string | null | undefined): ShapeCat | null {
  return SHAPE_CATS.find((c) => c.slug === slug) || null
}
