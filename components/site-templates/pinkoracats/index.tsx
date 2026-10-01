// A porta do tema `pinkoracats` — é este arquivo que as rotas montam.
//
// ACRYLIC VAULT — uma joalheria digital de press-on nails: branco é o espaço,
// preto é a informação, prata é a arquitetura, o acrílico é a identidade e as
// unhas são a cor. Cada produto é exposto numa caixa acrílica
// (`AcrylicProductCase`), nunca num card.
//
// Componente de SERVIDOR: fontes, folha e JSON-LD precisam estar no HTML que o
// buscador lê. As peças com gesto (Vault, drop, esteira, Case, quick view,
// busca, lente, cursor, movimento) são de cliente, por dentro.
//
// ⚠️ TEMA AUTORAL: a marca e os textos moram no código (`content/`). O `data`
// traz UMA coisa só — a Loja da Taiz ao vivo (`data.catalog`, mig 271), que
// vira o catálogo do site. Sem produto ativo na Loja, é a prévia que aparece.
//
// ⚠️ A FOLHA E AS FONTES SÃO IMPORTADAS AQUI, e tudo é escopado em
// `.tpl-pinkora`: regra solta atravessaria a Freelandoo inteira.

import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google"
import type { Metadata } from "next"

import { SiteAnalytics } from "./analytics"
import { BRAND } from "./content/brand"
import { CaseDrawer, OrderPanel, QuickView, SearchOverlay } from "./commerce"
import { buildCatalog } from "./content/catalog"
import { CursorFollower, SiteFooter, SiteHeader } from "./chrome"
import { PAGE, pageHref, type TemplateLinks } from "./lib"
import Motion from "./motion"
import { pageMeta, pageSlug, pinkoraPageSlugs, resolvePinkoraPage, type PinkoraPage } from "./pages"
import HomePage from "./pages/home"
import { AboutPage, CollectionPage, ProductPage, ShopPage } from "./pages/inner"
import { BreadcrumbLd, ProductLd, StoreLd } from "./schema"
import { StoreProvider } from "./store"
import "./theme.css"

/**
 * DISPLAY EDITORIAL: serifa de revista, condensada e precisa — a manchete
 * monumental em preto. Nada decorativo: é a voz de passarela, não de convite.
 */
const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--pk-font-display",
  display: "swap",
})
/** Texto: grotesca moderna, extremamente legível. */
const sans = Geist({ subsets: ["latin"], variable: "--pk-font-sans", display: "swap" })
/** Metadado técnico: "PC / 001", "DROP / 01", "DETAIL / 01". */
const mono = Geist_Mono({ subsets: ["latin"], variable: "--pk-font-mono", display: "swap" })

export { pinkoraPageSlugs, resolvePinkoraPage }
export type { PinkoraPage }

/**
 * ⚠️ TÍTULO `absolute` (o layout raiz acrescentaria a marca da plataforma) e
 * CANÔNICO ABSOLUTO com a origem desta visita — caminho relativo resolveria
 * contra freelandoo.com.br e tiraria o site da cliente do índice.
 */
export function pinkoraMetadata({
  data,
  links,
  page = null,
}: {
  data?: unknown
  links: TemplateLinks
  page?: PinkoraPage | null
}): Metadata {
  const { title, description } = pageMeta(page, buildCatalog(data))
  const slug = pageSlug(page)
  const url = `${links.origin}${slug ? pageHref(links, slug) : links.home}`
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: page?.kind === "product" ? "article" : "website",
      url,
      siteName: BRAND.full,
      locale: "pt_BR",
    },
    twitter: { card: "summary", title, description },
  }
}

export function PinkoracatsSite({
  data,
  links,
  page = null,
}: {
  data?: unknown
  links: TemplateLinks
  page?: PinkoraPage | null
}) {
  const catalog = buildCatalog(data)
  const slug = pageSlug(page)
  const url = `${links.origin}${slug ? pageHref(links, slug) : links.home}`
  const trail: { name: string; href: string }[] = !page
    ? []
    : page.kind === "product"
      ? [
          { name: page.product.name, href: pageHref(links, page.product.slug) },
        ]
      : page.kind === "collection"
        ? [{ name: page.collection.name, href: pageHref(links, page.collection.slug) }]
        : page.kind === "loja"
          ? [{ name: "Loja", href: pageHref(links, PAGE.loja) }]
          : [{ name: "Sobre", href: pageHref(links, PAGE.sobre) }]

  return (
    <div
      className={`tpl-pinkora ${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      {/* O gate do movimento, escrito durante o PARSE (antes da 1ª pintura).
          Sem JS o atributo nunca existe e a página aparece INTEIRA. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var s=document.currentScript;if(s&&s.parentElement&&!matchMedia('(prefers-reduced-motion: reduce)').matches)s.parentElement.setAttribute('data-motion','on')})()",
        }}
      />
      <StoreLd origin={links.origin} home={links.home} />
      <BreadcrumbLd origin={links.origin} home={links.home} trail={trail} />
      {page?.kind === "product" ? (
        <ProductLd origin={links.origin} home={links.home} url={url} product={page.product} live={catalog.live} />
      ) : null}

      <div className="tpl-pinkora__bg" aria-hidden="true" />

      <StoreProvider links={links} catalog={catalog}>
        <a href="#conteudo" className="pk-skip">
          Ir para o conteúdo
        </a>
        <SiteHeader links={links} />
        <main id="conteudo">
          {!page ? (
            <HomePage links={links} catalog={catalog} />
          ) : page.kind === "product" ? (
            <ProductPage links={links} catalog={catalog} product={page.product} />
          ) : page.kind === "collection" ? (
            <CollectionPage links={links} catalog={catalog} collection={page.collection} />
          ) : page.kind === "loja" ? (
            <ShopPage links={links} catalog={catalog} />
          ) : (
            <AboutPage links={links} catalog={catalog} />
          )}
        </main>
        <SiteFooter links={links} />
        <CaseDrawer />
        <QuickView />
        <OrderPanel />
        <SearchOverlay />
        <CursorFollower />
        <Motion />
      </StoreProvider>

      <SiteAnalytics communityId={links.communityId} bookingHref={links.booking} />
    </div>
  )
}
