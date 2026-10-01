// OS FORMATOS DE UNHA — as categorias do leque do herói e o filtro do catálogo.
//
// ⚠️ O FORMATO DE UM PRODUTO SAI DO QUE A TAIZ ESCOLHEU, nunca de sorteio.
// O desenho do placeholder (`product.shape`) é escolhido pelo id quando ela
// não disse nada — serve para a vitrine não ficar vazia, mas NÃO é dado.
// Filtrar categoria por ele mostraria produtos aleatórios sob "Stiletto".
// Na Loja de verdade, quem decide é a COLEÇÃO do produto (2026-10-01, pedido
// do Alex): as coleções da Taiz SÃO os formatos, e `collectionShape` reconhece
// cada uma pelo nome/endereço. A linha "• Formato …" da descrição vale só para
// a prévia. Produto sem coleção de formato aparece só em "Todos".
//
// Formato novo = uma entrada aqui (e, se precisar de desenho próprio, o
// caminho em `nail.tsx`).

import type { NailShape } from "./products.mock"

export type ShapeSlug = "stiletto" | "almond" | "quadrada" | "bailarina" | "duck" | "garra"

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
  { slug: "bailarina", label: "Bailarina", draw: "coffin", tint: ["#f5f6f8", "#d42f42"], match: /bailarin|ballerina|coffin/ },
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

/** O formato que uma coleção da Loja representa ("Stiletto", "Duck nails"…), ou `null`. */
export function collectionShape(name: string, slug: string): ShapeSlug | null {
  const l = norm(`${slug} ${name}`)
  const cat = SHAPE_CATS.find((c) => c.match.test(l))
  return cat ? cat.slug : null
}

export function shapeCat(slug: string | null | undefined): ShapeCat | null {
  return SHAPE_CATS.find((c) => c.slug === slug) || null
}
