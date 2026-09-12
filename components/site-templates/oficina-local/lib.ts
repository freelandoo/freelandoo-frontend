// Helpers do tema `oficina-local`. Sem JSX e sem estado — só derivação.

import type { OficinaLocalData, TemplateBusiness, TemplateLinks } from "@/types/site-template"

/** O que todo bloco do tema recebe: os dados e os endereços deste site. */
export type Ctx = {
  data: OficinaLocalData
  links: TemplateLinks
}

/**
 * O link do WhatsApp com a mensagem já escrita.
 *
 * ⚠️ O HOST É `wa.me`, e não é indiferente: é ele que o contador de cliques do
 * painel de Indicadores reconhece (`SiteAnalytics` olha o host do link). Um
 * `api.whatsapp.com/send` também conta; qualquer outro encurtador abriria a
 * conversa e não contaria nada — e o painel diria "zero cliques", que é pior
 * do que não dizer, porque parece dado.
 *
 * Mensagem vazia devolve o link puro: `?text=` sem conteúdo faz o WhatsApp
 * abrir com uma linha em branco no campo, que a pessoa precisa apagar.
 */
export function waLink(business: TemplateBusiness, message?: string): string | null {
  const num = (business.whatsappNumber || "").replace(/\D/g, "")
  if (!num) return null
  const msg = (message || "").trim()
  return msg ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/${num}`
}

/** `tel:` do número, quando houver. */
export function telHref(business: TemplateBusiness): string | null {
  const e164 = (business.phoneE164 || "").trim()
  if (e164) return `tel:${e164}`
  const num = (business.whatsappNumber || "").replace(/\D/g, "")
  return num ? `tel:+${num}` : null
}

/**
 * O endereço de uma página interna.
 *
 * Nunca escrever `/pagina/x` à mão: o mesmo site é servido em três endereços
 * (plataforma, subdomínio e domínio próprio) e o caminho cru acertaria em um e
 * quebraria nos outros dois.
 */
export function pageHref(links: TemplateLinks, slug: string): string {
  return `${links.pageBase}/${slug}`
}

/**
 * A mensagem de WhatsApp de uma página, com as reservas na ordem certa: a da
 * própria página, a geral do site, e por fim uma frase montada com o nome do
 * negócio — melhor do que abrir a conversa em branco, que faz a pessoa ter de
 * explicar do zero de onde veio.
 */
export function waMessageFor(data: OficinaLocalData, own?: string): string {
  const nome = data.business.name
  return (
    own?.trim() ||
    data.waDefault?.trim() ||
    (nome ? `Olá! Encontrei o site da ${nome} e gostaria de mais informações.` : "")
  )
}

/**
 * A cidade-sede: a marcada, ou a primeira da lista.
 *
 * Nunca inventa: sem cidade cadastrada devolve `null`, e quem chama omite a
 * frase em vez de escrever "em undefined".
 */
export function baseCity(data: OficinaLocalData) {
  return data.cities.find((c) => c.isBase) || data.cities[0] || null
}

/** "Aguaí — SP", ou só o que existir. */
export function cityLabel(city: { name: string; uf: string }): string {
  return city.uf ? `${city.name} — ${city.uf}` : city.name
}

/**
 * O nome da marca partido em duas linhas, como o lettering do desenho: a
 * primeira palavra em ouro, o resto em prata.
 *
 * Nome de uma palavra só devolve a segunda linha vazia — quem desenha omite,
 * em vez de imprimir uma linha em branco embaixo do logo.
 */
export function brandLines(name: string): { top: string; bottom: string } {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { top: "", bottom: "" }
  if (parts.length === 1) return { top: parts[0], bottom: "" }
  return { top: parts[0], bottom: parts.slice(1).join(" ") }
}
