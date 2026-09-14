// A porta do tema `ecoluz` — é este arquivo que as rotas montam.
//
// Componente de SERVIDOR de propósito: ele carrega as fontes, a folha do tema
// e o JSON-LD, as três coisas que precisam estar no HTML que o buscador lê e
// que um componente de cliente entregaria tarde demais. As peças com gesto (a
// barra, o menu do celular, o botão flutuante, a calculadora, o movimento) é
// que são de cliente, por dentro.
//
// ⚠️ A FOLHA E AS FONTES SÃO IMPORTADAS AQUI, e não no layout: assim elas só
// entram nas rotas que realmente desenham este site. Peça nova do tema entra
// por dentro desta porta — solta numa rota, ela não recebe nem a pele
// (`.tpl-ecoluz`) nem as variáveis de fonte, e o site sai sem tipografia sem
// um único erro aparecer.
//
// ⚠️ ISTO É UM TEMA AUTORAL: TODO O CONTEÚDO MORA NO CÓDIGO (`content/`). Ao
// ser portado, o `normalize` do backend devolve `{}` e nada é gravado no
// documento — o `data` que chega é ignorado de propósito, porque não existe
// outro cliente para quem este site sirva com outro texto.

import { Archivo, Inter_Tight } from "next/font/google";
import type { Metadata } from "next";

import { SiteAnalytics } from "./analytics";
import { BUSINESS } from "./content/business";
import { FAQ } from "./content/site";
import { SiteFooter, SiteHeader, WhatsappFab } from "./chrome";
import { PAGE, pageHref, type TemplateLinks } from "./lib";
import AreaPage from "./pages/area";
import AreasPage from "./pages/areas-index";
import ContatoPage from "./pages/contact";
import HomePage from "./pages/home";
import ServicoPage from "./pages/service";
import ServicosPage from "./pages/services-index";
import SobrePage from "./pages/about";
import { PAGE_SLUGS, pageMeta, pageSlug, resolveEcoluzPage, type EcoluzPage } from "./pages";
import ScrollMotion from "./scroll-motion";
import SunIntro from "./intro";
import { BreadcrumbLd, BusinessLd, FaqLd, ServiceLd, WebSiteLd } from "./schema";
import "./theme.css";

/**
 * O display: Archivo, uma grotesca de largura variável.
 *
 * ⚠️ `axes: ["wdth"]` NÃO É DETALHE — É A ESCOLHA INTEIRA. A voz deste site
 * está na LARGURA do tipo: a manchete sai expandida (112%), como lettering de
 * placa; o sobretítulo sai condensado (84%), como etiqueta técnica. Sem o eixo
 * declarado, os dois saem na largura normal e o site perde a voz **sem um
 * único erro aparecer** — o `font-stretch` do CSS simplesmente não tem o que
 * variar.
 *
 * ⚠️ E A PLATAFORMA JÁ CARREGA ARCHIVO, SEM O EIXO. Reusar aquela instância
 * seria exatamente o defeito silencioso descrito acima; esta é declarada à
 * parte de propósito, e é por isso que o `next/font` gera duas — o custo é uma
 * requisição que só existe nas rotas de site pronto.
 */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--el-font-display",
  display: "swap",
});

/**
 * O texto: Inter Tight.
 *
 * A Inter comum é a fonte padrão de metade da internet — e num site que
 * precisa não parecer template, ela entrega o contrário. A Tight é a mesma
 * família com o espacejamento fechado: mantém a legibilidade em corpo pequeno
 * (que é onde o texto deste site vive) e ganha densidade, que é o que combina
 * com a largura expandida do display.
 */
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--el-font-body",
  display: "swap",
});

export { PAGE_SLUGS as ecoluzPageSlugs, resolveEcoluzPage };
export type { EcoluzPage };

/**
 * Os metadados da página.
 *
 * ⚠️ O TÍTULO É `absolute`: o layout raiz da plataforma acrescenta o nome da
 * Freelandoo ao fim de todo título. No site do cliente isso seria a NOSSA
 * marca carimbada no resultado de busca DELE.
 *
 * ⚠️ E O CANÔNICO É ABSOLUTO, COM A ORIGEM DESTA VISITA — nunca o caminho
 * cru. Caminho relativo em `canonical` e em `og:url` é resolvido pelo Next
 * contra o `metadataBase` do layout DA PLATAFORMA: no domínio do cliente, cada
 * página passaria a declarar-se cópia de uma URL da freelandoo.com.br. O
 * buscador obedece a essa declaração — tira a página do cliente do índice e
 * fica com a nossa. Já aconteceu uma vez, e manteve um site inteiro fora do
 * Google.
 */
export function ecoluzMetadata({
  links,
  page = null,
}: {
  data?: unknown;
  links: TemplateLinks;
  page?: EcoluzPage | null;
}): Metadata {
  const { title, description } = pageMeta(page);
  const slug = pageSlug(page);
  const path = slug ? pageHref(links, slug) : links.home;
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
 */
export function EcoluzSite({
  links,
  page = null,
}: {
  data?: unknown;
  links: TemplateLinks;
  page?: EcoluzPage | null;
}) {
  const ctx = { links };
  const slug = pageSlug(page);
  const url = `${links.origin}${slug ? pageHref(links, slug) : links.home}`;

  // A trilha de migalhas da página interna. Na home ela fica vazia — uma
  // migalha de um item só não diz nada ao buscador e aparece como trilha
  // quebrada no resultado.
  const trail: { name: string; href: string }[] = !page
    ? []
    : page.kind === "service"
      ? [
          { name: "Serviços", href: pageHref(links, PAGE.servicos) },
          { name: page.service.label, href: pageHref(links, page.service.slug) },
        ]
      : page.kind === "area"
        ? [
            { name: "Onde atendemos", href: pageHref(links, PAGE.areas) },
            { name: page.area.name, href: pageHref(links, page.area.slug) },
          ]
        : [{ name: pageMeta(page).title.split(" | ")[0], href: pageHref(links, slug as string) }];

  return (
    <div className={`tpl-ecoluz ${archivo.variable} ${interTight.variable}`}>
      {/* ⚠️ O GATE DO MOVIMENTO, escrito durante o PARSE do HTML.
          Ele marca o próprio elemento pai — `document.currentScript` é o
          <script> que está executando, e o pai dele é a div do tema.

          Por que inline e não num efeito: o CSS só esconde os blocos quando
          este atributo existe. Posto num `useEffect`, ele chegaria DEPOIS da
          primeira pintura — o conteúdo apareceria, sumiria e voltaria
          animando. E, sem JavaScript, o atributo nunca é escrito: a página
          aparece inteira, em vez de ficar em branco. É o que garante que quem
          tem JS bloqueado (e o robô, que não executa script) veja o site. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            "(function(){var s=document.currentScript;if(s&&s.parentElement)s.parentElement.setAttribute('data-motion','on')})()",
        }}
      />

      {/* A ficha do negócio e a do site saem em TODA página, de propósito:
          elas carregam o mesmo `@id`, então o buscador lê as catorze páginas
          como um negócio só em vez de treze fichas soltas. */}
      <BusinessLd origin={links.origin} />
      <WebSiteLd origin={links.origin} />
      <BreadcrumbLd origin={links.origin} home={links.home} trail={trail} />

      {/* ⚠️ O FAQ MARCADO É SEMPRE O QUE A PÁGINA MOSTRA. Na home é o geral;
          na página de serviço é o dele. Marcar pergunta que o visitante não
          encontra na página é conteúdo oculto, e rende ação manual. */}
      {!page ? <FaqLd items={FAQ} /> : null}
      {page?.kind === "service" ? (
        <>
          <ServiceLd origin={links.origin} url={url} service={page.service} />
          <FaqLd items={page.service.faq} />
        </>
      ) : null}

      {/* O fundo é o PRIMEIRO filho e não tem z-index acima dos irmãos: tudo
          que vem depois no DOM pinta por cima dele. */}
      <div className="tpl-ecoluz__bg" aria-hidden="true" />

      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--el-sun)] focus:px-4 focus:py-2 focus:text-[var(--el-ink)]"
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
        ) : page.kind === "areas" ? (
          <AreasPage {...ctx} />
        ) : page.kind === "sobre" ? (
          <SobrePage {...ctx} />
        ) : (
          <ContatoPage {...ctx} />
        )}
      </main>

      <SiteFooter links={links} />
      <WhatsappFab />
      <ScrollMotion />

      {/* ⚠️ A ABERTURA É O ÚLTIMO FILHO, E NÃO O PRIMEIRO. Ela precisa pintar
          por cima de tudo (inclusive da barra fixa), e aqui quem vem depois no
          DOM pinta por cima. Ela não existe no HTML do servidor de propósito:
          assim o herói é o LCP, e o raio passa por cima de uma página que já
          está lá. Ver a nota longa em `intro.tsx`. */}
      <SunIntro />

      {/* O contador do painel de Indicadores — ver `analytics.tsx`. */}
      <SiteAnalytics communityId={links.communityId} bookingHref={links.booking} />
    </div>
  );
}
