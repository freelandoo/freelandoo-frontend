// A porta do tema `ricardo-fogoes` — é este arquivo que as rotas montam.
//
// Componente de SERVIDOR de propósito: ele carrega as fontes, a folha do tema e
// o JSON-LD, as três coisas que precisam estar no HTML que o buscador lê e que
// um componente de cliente entregaria tarde demais. As peças com gesto (barra,
// botão flutuante, fundo de GPU, reveals) é que são de cliente, por dentro.
//
// ⚠️ A FOLHA E AS FONTES SÃO IMPORTADAS AQUI, e não no layout: assim elas só
// entram nas rotas que realmente desenham este site. Peça nova do tema entra
// por dentro desta porta — solta numa rota, ela não recebe nem a pele
// (`.tpl-ricardo`) nem as variáveis de fonte, e o site sai sem tipografia sem
// um único erro aparecer.
//
// ⚠️ ISTO É UM TEMA AUTORAL: TODO O CONTEÚDO MORA NO CÓDIGO
// (`content/services.ts`, `content/cities.ts`, `content/business.ts`), e por
// isso o `normalize` do backend devolve `{}` e nada é gravado no documento. O
// `data` que chega aqui é ignorado de propósito — não existe cliente nenhum
// para quem este site sirva com outro texto.

import { Anybody, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import type { Metadata } from "next"

import { SiteAnalytics } from "@/components/site/site-analytics"
import type { TemplateLinks } from "@/types/site-template"

import { BUSINESS } from "./content/business"
import Hero from "./hero"
import { pageHref, type Ctx } from "./lib"
import AboutPage from "./pages/about"
import AreasPage from "./pages/areas"
import CidadePage from "./pages/city"
import ContatoPage from "./pages/contact"
import HomePage from "./pages/home"
import ServicoPage from "./pages/service"
import ServicosPage from "./pages/services-index"
import { pageMeta, pageSlug, resolveRicardoPage, type RicardoPage } from "./pages"
import { BusinessLd, WebSiteLd } from "./schema"
import SiteFooter from "./site-footer"
import SiteHeader from "./site-header"
import ThermalField from "./thermal-field"
import WhatsappFab from "./whatsapp-fab"
import "./theme.css"

/**
 * Display variável em LARGURA.
 *
 * ⚠️ `axes: ["wdth"]` NÃO É DETALHE: é esse eixo que faz a manchete abrir a
 * 112% no desktop e comprimir a 88% no celular sem trocar de corpo. Sem
 * declará-lo, todo o lettering condensado sai na largura normal — e não aparece
 * erro nenhum, só a tipografia errada.
 *
 * ⚠️ OS NOMES DAS VARIÁVEIS (`--rf-*`) SÃO OS QUE `theme.css` ESPERA. No
 * projeto de origem eram `--font-anybody`/`--font-plex`; aqui eles convivem com
 * a Freelandoo, e um `--font-*` solto colidiria com o da plataforma.
 */
const anybody = Anybody({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--rf-anybody",
  display: "swap",
})

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--rf-plex",
  display: "swap",
})

/** Só na cota do desenho. É a fala da prancha, não rótulo de interface. */
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--rf-plex-mono",
  display: "swap",
})

export { resolveRicardoPage }
export type { RicardoPage }

/**
 * Os metadados da página.
 *
 * ⚠️ O TÍTULO É `absolute`: o layout raiz da plataforma acrescenta o nome da
 * Freelandoo ao fim de todo título. No site do cliente isso seria a nossa marca
 * carimbada no resultado de busca DELE.
 *
 * ⚠️ O CANÔNICO SAI DE `links`, nunca de uma constante. O mesmo site responde
 * em três origens, e um canônico fixo diria ao buscador que a página mora em
 * outro lugar — justamente o dado com que ele decide quem é o dono dela.
 */
export function ricardoMetadata({
  links,
  page = null,
}: {
  data?: unknown
  links: TemplateLinks
  page?: RicardoPage | null
}): Metadata {
  const { title, description } = pageMeta(page)
  const slug = pageSlug(page)
  const path = slug ? pageHref(links, slug) : links.home

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: page ? "article" : "website",
      url: path,
      siteName: BUSINESS.name,
      locale: "pt_BR",
    },
    twitter: { card: "summary", title, description },
  }
}

/**
 * O site inteiro: casca, conteúdo e dados estruturados.
 *
 * `page` nulo é a home.
 */
export function RicardoFogoesSite({
  links,
  page = null,
}: {
  data?: unknown
  links: TemplateLinks
  page?: RicardoPage | null
}) {
  const ctx: Ctx = { links }

  return (
    <div className={`tpl-ricardo ${anybody.variable} ${plex.variable} ${plexMono.variable}`}>
      {/* A ficha do negócio e a do site saem em TODA página, de propósito:
          elas carregam o mesmo `@id`, então o buscador lê as quinze páginas
          como um negócio só em vez de quinze fichas soltas. */}
      <BusinessLd origin={links.origin} />
      <WebSiteLd origin={links.origin} />

      {/* O fundo é o PRIMEIRO filho e sem z-index: tudo que vem depois no DOM
          pinta por cima dele. */}
      <ThermalField />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-[var(--rf-flame)] focus:px-4 focus:py-2 focus:text-white"
      >
        Ir para o conteúdo
      </a>

      <SiteHeader links={links} />

      <main id="conteudo">
        {!page ? (
          <HomePage {...ctx} />
        ) : page.kind === "service" ? (
          <ServicoPage {...ctx} service={page.service} />
        ) : page.kind === "city" ? (
          <CidadePage {...ctx} city={page.city} />
        ) : page.kind === "servicos" ? (
          <ServicosPage {...ctx} />
        ) : page.kind === "areas" ? (
          <AreasPage {...ctx} />
        ) : page.kind === "contato" ? (
          <ContatoPage {...ctx} />
        ) : (
          <AboutPage {...ctx} />
        )}
      </main>

      <SiteFooter links={links} />
      <WhatsappFab />

      {/* O contador do painel de Indicadores. É o MESMO componente do site do
          construtor — um segundo contador daria duas contagens da mesma visita,
          e o painel do dono passaria a mostrar o dobro do movimento real. */}
      <SiteAnalytics communityId={links.communityId} bookingHref={links.booking} />
    </div>
  )
}

// `Hero` é montado pela home; o import explícito aqui existe só para o
// bundler tratá-lo como parte desta porta.
export { Hero }
