// A porta do tema `enzo-cortes` — é este arquivo que as rotas montam.
//
// Componente de SERVIDOR de propósito: ele carrega as fontes, a folha do tema
// e o JSON-LD, as três coisas que precisam estar no HTML que o buscador lê e
// que um componente de cliente entregaria tarde demais. As peças com gesto (a
// barra, o menu do celular, o botão flutuante, o movimento) é que são de
// cliente, por dentro.
//
// ⚠️ A FOLHA E AS FONTES SÃO IMPORTADAS AQUI, e não no layout: assim elas só
// entram nas rotas que realmente desenham este site. Peça nova do tema entra
// por dentro desta porta — solta numa rota, ela não recebe nem a pele
// (`.tpl-enzo`) nem as variáveis de fonte, e o site sai sem tipografia sem um
// único erro aparecer.
//
// ⚠️ ISTO É UM TEMA AUTORAL: TODO O CONTEÚDO MORA NO CÓDIGO
// (`content/business.ts`, `content/services.ts`, `content/areas.ts`,
// `content/faq.ts`). Ao ser portado para a Freelandoo, o `normalize` do
// backend devolve `{}` e nada é gravado no documento — o `data` que chega é
// ignorado de propósito, porque não existe outro cliente para quem este site
// sirva com outro texto.

import { Big_Shoulders, Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteAnalytics } from "./analytics";
import { BUSINESS } from "./content/business";
import { loadLivePrices } from "./content/live-prices";
import { setLivePrices, type PriceMap } from "./content/prices";
import { LivePrices } from "./live-prices-client";
import { FloatingActions, SiteFooter, SiteHeader } from "./chrome";
import { pageHref, type TemplateLinks } from "./lib";
import AreaPage from "./pages/area";
import ContatoPage from "./pages/contact";
import HomePage from "./pages/home";
import ServicoPage from "./pages/service";
import ServicosPage from "./pages/services-index";
import SobrePage from "./pages/about";
import { PAGE_SLUGS, pageMeta, pageSlug, resolveEnzoPage, type EnzoPage } from "./pages";
import Motion from "./experience/motion";
import { BusinessLd, WebSiteLd } from "./schema";
import "./theme.css";

/**
 * O display: Big Shoulders, uma grotesca CONDENSADA e pesada (800).
 *
 * É a voz "industrial" do briefing: condensada, ela aguenta os títulos
 * gigantes sem estourar a largura do celular — "CORTES" a 800 cabe em ~90vw
 * no corpo em que outra display já quebraria linha.
 *
 * ⚠️ OS NOMES DAS VARIÁVEIS (`--ec-font-*`) SÃO OS QUE `theme.css` ESPERA.
 * Dentro da Freelandoo elas convivem com as da plataforma, e um `--font-*`
 * solto colidiria com o dela.
 */
const display = Big_Shoulders({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--ec-font-display",
  display: "swap",
});

/** O texto: Geist — legível em corpo pequeno, neutra ao lado da display. */
const body = Geist({
  subsets: ["latin"],
  variable: "--ec-font-body",
  display: "swap",
});

/** A "régua": numeração, rótulos e coordenadas da precisão. */
const mono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ec-font-mono",
  display: "swap",
});

export { PAGE_SLUGS as enzoPageSlugs, resolveEnzoPage };
export type { EnzoPage };

/**
 * Os metadados da página.
 *
 * ⚠️ O TÍTULO É `absolute`: o layout raiz da plataforma acrescenta o nome da
 * Freelandoo ao fim de todo título. No site do cliente isso seria a NOSSA
 * marca carimbada no resultado de busca DELE.
 *
 * ⚠️ O CANÔNICO SAI DE `links`, nunca de uma constante. O mesmo site responde
 * em três origens, e um canônico fixo diria ao buscador que a página mora em
 * outro lugar — justamente o dado com que ele decide quem é o dono dela.
 */
export async function enzoMetadata({
  links,
  page = null,
}: {
  data?: unknown;
  links: TemplateLinks;
  page?: EnzoPage | null;
}): Promise<Metadata> {
  // O título e a descrição têm preço dentro ("Corte R$ 40"): sem ler o
  // cadastro ANTES, o resultado do Google anunciaria o valor antigo.
  setLivePrices(await loadLivePrices());
  const { title, description } = pageMeta(page);
  const slug = pageSlug(page);
  const path = slug ? pageHref(links, slug) : links.home;
  // ⚠️ ABSOLUTO, COM A ORIGEM DESTA VISITA — nunca o caminho cru.
  //
  // Caminho relativo em `canonical` e em `og:url` é resolvido pelo Next contra
  // o `metadataBase` do layout DA PLATAFORMA. No domínio do cliente isso fazia
  // cada página declarar-se cópia de uma URL da freelandoo.com.br — e o
  // buscador obedece a essa declaração: ele tira a página do cliente do índice
  // e fica com a nossa. Foi o que manteve `ricardofogoes.com.br` inteiro fora
  // do Google. O comentário acima já dizia "sai de `links`"; faltava sair
  // INTEIRO, com a origem na frente.
  const url = `${links.origin}${path}`;


  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: page ? "article" : "website",
      url,
      siteName: BUSINESS.name,
      locale: "pt_BR",
    },
    twitter: { card: "summary", title, description },
  };
}

/**
 * O site inteiro: casca, conteúdo e dados estruturados.
 *
 * `page` nulo é a home.
 *
 * ⚠️ TUDO PASSA PELO `PriceGate`: é ele que lê os preços do CADASTRO antes de
 * qualquer peça desenhar um número (ver `content/prices.ts`). A porta fica
 * síncrona porque o registro a chama como função.
 */
export function EnzoCortesSite(props: {
  data?: unknown;
  links: TemplateLinks;
  page?: EnzoPage | null;
  /**
   * Preços JÁ lidos por quem monta. É o caminho da pré-visualização do
   * construtor, que é componente de CLIENTE: lá o `PriceGate` (async, de
   * servidor) nunca resolve — React no navegador suspende um componente async
   * para sempre, e o iframe ficava eternamente em "Carregando…".
   */
  livePrices?: PriceMap;
}) {
  if (props.livePrices) {
    setLivePrices(props.livePrices);
    return (
      <LivePrices prices={props.livePrices}>
        <EnzoCortesContent links={props.links} page={props.page ?? null} />
      </LivePrices>
    );
  }
  return (
    <PriceGate>
      <EnzoCortesContent links={props.links} page={props.page ?? null} />
    </PriceGate>
  );
}

/**
 * Lê o cadastro e grava os preços nos DOIS lados: aqui (componentes de
 * servidor) e na ponte de cliente. Os filhos só renderizam depois.
 */
async function PriceGate({ children }: { children: ReactNode }) {
  const prices = await loadLivePrices();
  setLivePrices(prices);
  return <LivePrices prices={prices}>{children}</LivePrices>;
}

function EnzoCortesContent({
  links,
  page,
}: {
  links: TemplateLinks;
  page: EnzoPage | null;
}) {
  const ctx = { links };

  return (
    <div className={`tpl-enzo ${display.variable} ${body.variable} ${mono.variable}`}>
      {/* ⚠️ O GATE DO MOVIMENTO, escrito durante o PARSE do HTML.
          Ele marca o próprio elemento pai — `document.currentScript` é o
          <script> que está executando, e o pai dele é a div do tema.

          Por que inline e não num efeito: o CSS só esconde os blocos quando
          este atributo existe. Posto num `useEffect`, ele chegaria DEPOIS da
          primeira pintura — o conteúdo apareceria, sumiria e voltaria
          animando. E, sem JavaScript, o atributo nunca é escrito: a página
          aparece inteira, em vez de ficar em branco. É o que garante que
          quem tem JS bloqueado (e o robô que não executa script) veja o
          site. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var s=document.currentScript;if(s&&s.parentElement)s.parentElement.setAttribute('data-motion','on')})()",
        }}
      />

      {/* A ficha do negócio e a do site saem em TODA página, de propósito:
          elas carregam o mesmo `@id`, então o buscador lê as catorze páginas
          como um negócio só em vez de catorze fichas soltas. */}
      <BusinessLd origin={links.origin} />
      <WebSiteLd origin={links.origin} />

      {/* O fundo é o PRIMEIRO filho e não tem z-index acima dos irmãos: tudo
          que vem depois no DOM pinta por cima dele. */}
      <div className="tpl-enzo__bg" aria-hidden="true" />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--ec-volt)] focus:px-4 focus:py-2 focus:text-[var(--ec-ink)]"
      >
        Ir para o conteúdo
      </a>

      <SiteHeader links={links} />

      <main id="conteudo" className="relative">
        {!page ? (
          <HomePage {...ctx} />
        ) : page.kind === "service" ? (
          <ServicoPage {...ctx} service={page.service} />
        ) : page.kind === "area" ? (
          <AreaPage {...ctx} area={page.area} />
        ) : page.kind === "servicos" ? (
          <ServicosPage {...ctx} />
        ) : page.kind === "sobre" ? (
          <SobrePage {...ctx} />
        ) : (
          <ContatoPage {...ctx} />
        )}
      </main>

      <SiteFooter links={links} />
      <FloatingActions links={links} />
      <Motion />

      {/* O contador do painel de Indicadores. Ver `analytics.tsx` — é a única
          peça que difere entre este projeto e o tema dentro da Freelandoo. */}
      <SiteAnalytics communityId={links.communityId} bookingHref={links.booking} />
    </div>
  );
}
