// Dados estruturados (Schema.org) do tema `oficina-local`.
//
// É por causa disto que este tema existe. A página de cidade responde em busca
// local, e quem lê o par pergunta-e-resposta, o horário e a área atendida é o
// buscador — como texto corrido nada disso é entendido.
//
// ⚠️ REGRA DURA, e ela não é de gosto: nada de `aggregateRating`, `review`
// fabricada, `priceRange` chutado ou contagem de clientes. Só entra o que o
// documento informou. Nota média inventada é a única coisa aqui que seria
// mentira sobre a empresa — e é também o que rende penalização manual do
// Google, então a saída errada custa exatamente o que a feature veio buscar.
//
// ⚠️ E CAMPO VAZIO NÃO VIRA CAMPO: `prune` tira do objeto o que veio vazio, em
// vez de publicar `"telephone": ""`. Declarar um campo sem valor é pior do que
// omiti-lo — o buscador passa a ter uma afirmação vazia em vez de nenhuma.

import type { OficinaLocalData, TemplateFaq } from "@/types/site-template"
import type { Ctx } from "./lib"

/** Remove chaves vazias, nulas e listas vazias — em profundidade. */
function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined)
    return (arr.length ? arr : undefined) as T
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = prune(v)
      if (cleaned !== undefined) out[k] = cleaned
    }
    return (Object.keys(out).length ? out : undefined) as T
  }
  if (value === "" || value === null || value === undefined) return undefined as T
  return value
}

/** `https://dominio.com.br/pagina/x` — o JSON-LD não aceita caminho relativo. */
function abs(ctx: Ctx, path: string): string {
  const origin = ctx.links.origin.replace(/\/+$/, "")
  return path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * O identificador do negócio.
 *
 * Um só, e absoluto: é ele que a página de serviço e a de cidade citam em
 * `provider`, e é o que faz o buscador entender as dez páginas como UM negócio
 * em vez de dez fichas soltas.
 */
function businessId(ctx: Ctx): string {
  return `${abs(ctx, ctx.links.home)}#negocio`
}

/** A cidade como o Schema.org a espera. */
function cityNode(c: { name: string; uf: string }) {
  return prune({
    "@type": "City",
    name: c.name,
    addressRegion: c.uf,
    addressCountry: "BR",
  })
}

function areaServed(data: OficinaLocalData) {
  return data.cities.length ? data.cities.map(cityNode) : undefined
}

/**
 * A ficha do negócio.
 *
 * `HomeAndConstructionBusiness` ao lado de `LocalBusiness` porque este tema
 * serve prestador que atende no endereço do cliente — o tipo mais específico é
 * o que o buscador usa para decidir que a ficha responde a uma busca de
 * serviço, e não de loja.
 */
export function localBusinessSchema(ctx: Ctx) {
  const { data } = ctx
  const b = data.business
  const home = abs(ctx, ctx.links.home)

  return prune({
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "HomeAndConstructionBusiness"],
    "@id": businessId(ctx),
    name: b.name,
    legalName: b.legalName,
    description: b.tagline,
    url: home,
    telephone: b.phoneE164,
    image: b.heroPhoto ? abs(ctx, b.heroPhoto) : undefined,
    address: prune({
      "@type": "PostalAddress",
      streetAddress: b.street,
      addressLocality: b.city,
      addressRegion: b.state,
      postalCode: b.postalCode,
      addressCountry: b.country,
    }),
    geo: b.geo
      ? { "@type": "GeoCoordinates", latitude: b.geo.lat, longitude: b.geo.lng }
      : undefined,
    // O horário legível é o que o documento traz. Ele NÃO é convertido para
    // `openingHoursSpecification`: aquilo pede dia e hora em campos separados,
    // e adivinhá-los a partir de "segunda a sexta, das 8h às 18h" publicaria um
    // horário que ninguém escreveu — inclusive nos dias em que a frase for
    // outra. Convertê-lo é trabalho para um campo estruturado, não para uma
    // regex sobre texto livre.
    openingHours: b.hoursShort || undefined,
    areaServed: areaServed(data),
    paymentAccepted: b.payments.length ? b.payments.join(", ") : undefined,
    sameAs: data.googleProfileUrl ? [data.googleProfileUrl] : undefined,
    knowsAbout: data.services.length ? data.services.map((s) => s.label) : undefined,
  })
}

export function websiteSchema(ctx: Ctx) {
  const home = abs(ctx, ctx.links.home)
  return prune({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${home}#site`,
    url: home,
    name: ctx.data.business.name,
    inLanguage: "pt-BR",
    publisher: { "@id": businessId(ctx) },
  })
}

export function breadcrumbSchema(ctx: Ctx, items: { name: string; path: string }[]) {
  return prune({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(ctx, it.path),
    })),
  })
}

export function serviceSchema(
  ctx: Ctx,
  svc: { slug: string; label: string; metaDescription: string },
  url: string
) {
  const b = ctx.data.business
  return prune({
    "@context": "https://schema.org",
    "@type": "Service",
    name: svc.label,
    serviceType: svc.label,
    description: svc.metaDescription,
    url: abs(ctx, url),
    provider: { "@id": businessId(ctx) },
    areaServed: areaServed(ctx.data),
    availableChannel: prune({
      "@type": "ServiceChannel",
      serviceUrl: abs(ctx, url),
      servicePhone: b.phoneE164,
    }),
  })
}

/** A ficha de atendimento numa cidade — o nó que responde em busca local. */
export function cityServiceSchema(
  ctx: Ctx,
  city: { name: string; uf: string; prep: string; metaDescription: string },
  url: string
) {
  return prune({
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${ctx.data.business.tagline || ctx.data.business.name} ${city.prep}`.trim(),
    description: city.metaDescription,
    url: abs(ctx, url),
    provider: { "@id": businessId(ctx) },
    areaServed: cityNode(city),
    // ⚠️ Nada de `providerMobility` aqui. Ele diria se o prestador vai até o
    // cliente ou se o cliente leva o aparelho — e o documento não responde
    // isso. Um tema chamado "oficina" serve os dois casos, então o valor seria
    // chutado, que é o que a regra do topo proíbe.
  })
}

/**
 * Pergunta e resposta.
 *
 * ⚠️ Devolve `null` com lista vazia, e quem chama não desenha nada: um
 * `FAQPage` sem `mainEntity` é marcação inválida — o buscador registra o erro
 * na ficha do site em vez de simplesmente ignorar.
 */
export function faqSchema(items: TemplateFaq[]) {
  if (!items.length) return null
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
}

/**
 * Injeta o JSON-LD.
 *
 * `dangerouslySetInnerHTML` é obrigatório — o React escaparia as aspas e o
 * bloco deixaria de ser JSON. O escape de `<` cobre o caso que importa: um
 * `</script>` dentro de um texto do documento fecharia a tag aqui e o resto da
 * página viraria HTML solto. Valor vazio não desenha tag nenhuma.
 */
export function JsonLd({ data }: { data: unknown }) {
  if (!data) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
