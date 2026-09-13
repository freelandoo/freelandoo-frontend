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

import { Bodoni_Moda, Jost } from "next/font/google";
import type { Metadata } from "next";

import { SiteAnalytics } from "./analytics";
import { BUSINESS } from "./content/business";
import { SiteFooter, SiteHeader, WhatsappFab } from "./chrome";
import { pageHref, type TemplateLinks } from "./lib";
import AreaPage from "./pages/area";
import ContatoPage from "./pages/contact";
import HomePage from "./pages/home";
import ServicoPage from "./pages/service";
import ServicosPage from "./pages/services-index";
import SobrePage from "./pages/about";
import { pageMeta, pageSlug, resolveEnzoPage, type EnzoPage } from "./pages";
import ScrollMotion from "./scroll-motion";
import { BusinessLd, WebSiteLd } from "./schema";
import "./theme.css";

/**
 * O display: Bodoni Moda, um didone de altíssimo contraste.
 *
 * ⚠️ `axes: ["opsz"]` NÃO É DETALHE. Bodoni é uma família de TAMANHO ÓPTICO:
 * no corpo grande as hastes finas precisam afinar e o contraste abrir; no
 * corpo pequeno, o contrário, ou as finas somem na tela. Sem declarar o eixo,
 * o mesmo desenho sai em todos os corpos — e o sintoma é a manchete parecendo
 * "quebradiça" e o preço pequeno parecendo apagado, sem erro nenhum.
 *
 * ⚠️ E O ITÁLICO É CARREGADO DE PROPÓSITO: ele é a voz editorial do site (o
 * "Cortes" da marca, a numeração das listas, os destaques). Sem declará-lo, o
 * navegador SINTETIZA a inclinação — e Bodoni sintetizado é um itálico
 * falso, que num didone fica visivelmente errado.
 *
 * ⚠️ OS NOMES DAS VARIÁVEIS (`--ec-font-*`) SÃO OS QUE `theme.css` ESPERA.
 * Dentro da Freelandoo elas convivem com as da plataforma, e um `--font-*`
 * solto colidiria com o dela.
 */
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--ec-font-display",
  display: "swap",
});

/**
 * O texto: Jost, um geométrico derivado da Futura.
 *
 * A escolha é de época, não de gosto: Futura é de 1927 e é a companheira
 * natural de um didone num layout déco. Uma grotesca neutra ao lado de Bodoni
 * lê como "serif de revista + interface de app" — duas épocas na mesma página.
 */
const jost = Jost({
  subsets: ["latin"],
  variable: "--ec-font-body",
  display: "swap",
});

export { resolveEnzoPage };
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
export function enzoMetadata({
  links,
  page = null,
}: {
  data?: unknown;
  links: TemplateLinks;
  page?: EnzoPage | null;
}): Metadata {
  const { title, description } = pageMeta(page);
  const slug = pageSlug(page);
  const path = slug ? pageHref(links, slug) : links.home;

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
  };
}

/**
 * O site inteiro: casca, conteúdo e dados estruturados.
 *
 * `page` nulo é a home.
 */
export function EnzoCortesSite({
  links,
  page = null,
}: {
  data?: unknown;
  links: TemplateLinks;
  page?: EnzoPage | null;
}) {
  const ctx = { links };

  return (
    <div className={`tpl-enzo ${bodoni.variable} ${jost.variable}`}>
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
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[var(--ec-gold)] focus:px-4 focus:py-2 focus:text-[var(--ec-ink)]"
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
      <WhatsappFab />
      <ScrollMotion />

      {/* O contador do painel de Indicadores. Ver `analytics.tsx` — é a única
          peça que difere entre este projeto e o tema dentro da Freelandoo. */}
      <SiteAnalytics communityId={links.communityId} bookingHref={links.booking} />
    </div>
  );
}
