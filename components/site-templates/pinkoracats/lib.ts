// Os ENDEREÇOS do tema `pinkoracats`.
//
// ⚠️ NENHUM CAMINHO É ESCRITO À MÃO NAS PÁGINAS. O mesmo site responde em três
// origens (`/c/<slug>`, subdomínio e domínio próprio); um `/loja` literal
// acerta em uma e dá 404 nas outras duas. Toda página interna vive sob
// `links.pageBase` — o `/pagina/<slug>` que o `proxy.ts` reescreve sem
// consultar nada.

import type { TemplateLinks } from "@/types/site-template"

export type { TemplateLinks }

/** As páginas fixas. Coleções e produtos dividem o MESMO namespace de slug. */
export const PAGE = {
  loja: "loja",
  sobre: "sobre",
} as const

export function pageHref(links: TemplateLinks, slug: string): string {
  return `${links.pageBase}/${slug}`
}

/**
 * Centavos → texto de preço.
 *
 * Num lugar só para que o "R$" do card, do quick view, da página e do
 * carrinho seja igual — escrito à mão em cada um, a primeira mudança de
 * formato deixa um para trás.
 */
export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export type Ctx = { links: TemplateLinks }
