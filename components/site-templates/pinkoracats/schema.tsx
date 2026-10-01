// O JSON-LD. Regras do contrato de tema, todas valendo aqui:
//
// ⚠️ Nada de `aggregateRating`, `review` ou `priceRange` — não existe avaliação
// nenhuma desta marca ainda, e nota inventada rende ação manual.
// ⚠️ OFERTA (preço) SÓ COM CATÁLOGO DEFINITIVO: enquanto o catálogo for a
// prévia (`live` falso) os preços são provisórios, e preço chutado no dado
// estruturado é pior que preço nenhum. Com a Loja ao vivo, o preço é o mesmo
// que o carrinho cobra. O produto continua marcado (nome, descrição, marca).
// ⚠️ Campo vazio não vira campo (`prune`).

import { BRAND } from "./content/brand"
import type { Product } from "./content/products.mock"

function prune(v: unknown): unknown {
  if (Array.isArray(v)) {
    const a = v.map(prune).filter((x) => x !== undefined)
    return a.length ? a : undefined
  }
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v)) {
      const p = prune(x)
      if (p !== undefined && p !== "" && p !== null) o[k] = p
    }
    return Object.keys(o).length ? o : undefined
  }
  return v === "" || v === null ? undefined : v
}

function Ld({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(prune(data)).replace(/</g, "\\u003c") }}
    />
  )
}

export function StoreLd({ origin, home }: { origin: string; home: string }) {
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "@id": `${origin}${home}#store`,
        name: BRAND.full,
        url: `${origin}${home}`,
        email: BRAND.email,
        founder: { "@type": "Person", name: BRAND.owner },
        address: {
          "@type": "PostalAddress",
          addressLocality: BRAND.city,
          addressRegion: BRAND.state,
          addressCountry: BRAND.country,
        },
        sameAs: BRAND.instagram ? [BRAND.instagram] : undefined,
      }}
    />
  )
}

export function BreadcrumbLd({
  origin,
  home,
  trail,
}: {
  origin: string
  home: string
  trail: { name: string; href: string }[]
}) {
  if (!trail.length) return null
  const items = [{ name: "Início", href: home }, ...trail]
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.name,
          item: `${origin}${t.href}`,
        })),
      }}
    />
  )
}

export function ProductLd({
  origin,
  home,
  url,
  product,
  live,
}: {
  origin: string
  home: string
  url: string
  product: Product
  live: boolean
}) {
  const images = [product.image, ...product.detailImages]
    .filter((s): s is string => !!s)
    .map((s) => (s.startsWith("http") ? s : `${origin}${s}`))
  return (
    <Ld
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: product.description || product.tagline,
        sku: product.id,
        url,
        image: images,
        brand: { "@type": "Brand", name: BRAND.full },
        seller: { "@id": `${origin}${home}#store` },
        offers: !live
          ? undefined
          : {
              "@type": "Offer",
              url,
              priceCurrency: "BRL",
              price: (product.priceCents / 100).toFixed(2),
              availability:
                product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
      }}
    />
  )
}
