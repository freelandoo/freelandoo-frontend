// A porta do tema `oficina-local`: é este arquivo que as rotas montam.
//
// Componente de SERVIDOR de propósito. Ele carrega as fontes, a folha do tema
// e o JSON-LD — as três coisas que precisam estar no HTML que o buscador lê, e
// que um componente de cliente entregaria tarde demais. As peças com gesto
// (barra, botão flutuante, fundo, movimento) é que são de cliente.
//
// ⚠️ A FOLHA E AS FONTES SÃO IMPORTADAS AQUI, e não no layout: assim elas só
// entram nas rotas que realmente desenham um site gerenciado. Peça nova do tema
// entra por dentro deste componente — solta numa rota, ela não recebe nem a
// pele (`.tpl-oficina`) nem as variáveis de fonte, e o tema sai sem tipografia
// sem um único erro aparecer.

import { Archivo, Barlow } from "next/font/google"
import type { Metadata } from "next"

import { SiteAnalytics } from "@/components/site/site-analytics"
import type { OficinaLocalData, TemplateLinks } from "@/types/site-template"

import { SiteFooter, SiteHeader, WhatsappFab } from "./chrome"
import OficinaCityPage from "./city-page"
import OficinaHome from "./home"
import { pageHref, waLink, waMessageFor, type Ctx } from "./lib"
import { resolveOficinaPage, type OficinaPage } from "./pages"
import {
  JsonLd,
  breadcrumbSchema,
  cityServiceSchema,
  faqSchema,
  localBusinessSchema,
  serviceSchema,
  websiteSchema,
} from "./schema"
import ScrollMotion from "./scroll-motion"
import OficinaServicePage from "./service-page"
import TechBackdrop from "./tech-backdrop"
import "./theme.css"

/**
 * Display condensado e pesado.
 *
 * ⚠️ `axes: ["wdth"]` NÃO É DETALHE: é o eixo variável de largura, e é ele que
 * faz o `font-stretch` dos títulos valer. O layout da plataforma já carrega um
 * Archivo, mas SEM esse eixo — reusar aquele faria todo o lettering condensado
 * do tema sair na largura normal, sem erro nenhum, só com a tipografia errada.
 */
const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-oficina-display",
  display: "swap",
})

/** Corpo: grotesca industrial, legível em texto corrido. */
const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oficina-body",
  display: "swap",
})

export { resolveOficinaPage }
export type { OficinaPage }

/** O caminho desta página dentro do site — o que vira canônico e trilha. */
function pathFor(links: TemplateLinks, page: OficinaPage | null): string {
  if (!page) return links.home
  return pageHref(links, page.kind === "service" ? page.service.slug : page.city.slug)
}

/**
 * Os metadados da página.
 *
 * ⚠️ O TÍTULO É `absolute`: o layout raiz da plataforma tem um template que
 * acrescenta o nome da Freelandoo ao fim de todo título. No site do cliente
 * isso seria a nossa marca carimbada no resultado de busca DELE.
 */
export function oficinaMetadata({
  data,
  links,
  page,
}: {
  data: OficinaLocalData
  links: TemplateLinks
  page: OficinaPage | null
}): Metadata {
  const b = data.business
  const path = pathFor(links, page)

  const title = page
    ? page.kind === "service"
      ? page.service.metaTitle || `${page.service.label}${b.name ? ` · ${b.name}` : ""}`
      : page.city.metaTitle || `${page.city.name}${b.name ? ` · ${b.name}` : ""}`
    : [b.name, b.tagline].filter(Boolean).join(" · ") || b.name

  const description = page
    ? page.kind === "service"
      ? page.service.metaDescription || page.service.cardText
      : page.city.metaDescription || page.city.cardText
    : b.tagline

  // A imagem de preview é o retrato do banner — o único ativo visual que o
  // documento garante. Sem ele o card do link sai sem imagem, que é melhor do
  // que apontar para uma foto de serviço que não representa o negócio.
  const image = b.heroPhoto || undefined

  return {
    title: { absolute: title },
    description: description || undefined,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: description || undefined,
      type: page ? "article" : "website",
      url: path,
      siteName: b.name || undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: description || undefined,
      images: image ? [image] : undefined,
    },
  }
}

/**
 * O site inteiro: casca, conteúdo e dados estruturados.
 *
 * `page` nulo é a home. A rota resolve qual página é (com `resolveOficinaPage`)
 * e devolve 404 quando o endereço não existe — decidir isso aqui dentro daria
 * uma página de "não encontrado" com status 200, que o buscador indexaria.
 */
export function OficinaLocalSite({
  data,
  links,
  page = null,
}: {
  data: OficinaLocalData
  links: TemplateLinks
  page?: OficinaPage | null
}) {
  const ctx: Ctx = { data, links }
  const b = data.business

  // A mensagem do botão flutuante é DESTA página. É o que faz o lead chegar
  // dizendo de onde veio — quem clica na página de uma cidade abre a conversa
  // já dizendo qual é. Montada aqui, num lugar só: escrita em cada página, a
  // que esquecesse abriria o WhatsApp em branco.
  const message = waMessageFor(
    data,
    page ? (page.kind === "service" ? page.service.waMessage : page.city.waMessage) : undefined
  )

  const path = pathFor(links, page)
  const trail = page
    ? [
        { name: "Início", path: links.home },
        {
          name: page.kind === "service" ? page.service.label : page.city.name,
          path,
        },
      ]
    : [{ name: "Início", path: links.home }]

  // As perguntas DESTA página. A home usa as do site; a de serviço e a de
  // cidade, as próprias — publicar as duas listas juntas faria o buscador ler
  // pergunta de outra página como resposta desta.
  const faq = page
    ? page.kind === "service"
      ? page.service.faq
      : page.city.faq
    : data.faq

  return (
    <div className={`tpl-oficina ${display.variable} ${body.variable}`}>
      {/* O fundo é o PRIMEIRO filho e sem z-index: tudo que vem depois no DOM
          pinta por cima dele, que é a mesma ordem de pintura que faz a foto do
          headcard cobrir a pilha de pills. */}
      <TechBackdrop />

      <a href="#conteudo" className="fx-skip">
        Ir para o conteúdo
      </a>

      <SiteHeader ctx={ctx} />

      <main id="conteudo" className="fx-layer">
        {!page ? (
          <OficinaHome ctx={ctx} />
        ) : page.kind === "service" ? (
          <OficinaServicePage ctx={ctx} service={page.service} />
        ) : (
          <OficinaCityPage ctx={ctx} city={page.city} />
        )}
      </main>

      <SiteFooter ctx={ctx} />

      <WhatsappFab
        href={waLink(b, message)}
        label={b.owner ? `Falar com ${b.owner}` : "Falar no WhatsApp"}
      />

      <ScrollMotion />

      {/* O contador do painel de Indicadores. É o MESMO componente do site do
          construtor — um segundo contador aqui daria duas contagens da mesma
          visita, e o painel do dono mostraria o dobro do movimento real. */}
      <SiteAnalytics communityId={links.communityId} bookingHref={links.booking} />

      {/* ── dados estruturados ──────────────────────────────────────────────
          A ficha do negócio e a do site saem em TODA página, e é de propósito:
          elas carregam o mesmo `@id`, então o buscador lê as dez páginas como
          um negócio só em vez de dez fichas soltas. */}
      <JsonLd data={localBusinessSchema(ctx)} />
      <JsonLd data={websiteSchema(ctx)} />
      <JsonLd data={breadcrumbSchema(ctx, trail)} />
      <JsonLd data={faqSchema(faq)} />
      {page?.kind === "service" ? (
        <JsonLd data={serviceSchema(ctx, page.service, path)} />
      ) : null}
      {page?.kind === "city" ? <JsonLd data={cityServiceSchema(ctx, page.city, path)} /> : null}
    </div>
  )
}
