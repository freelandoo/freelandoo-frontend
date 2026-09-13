/**
 * O BANNER.
 *
 * ── O QUE ELE RESOLVE NOS PRIMEIROS DOIS SEGUNDOS ────────────────────────
 * Quem chega aqui veio de uma busca por barbearia e tem três perguntas, nesta
 * ordem: é perto de mim? quanto custa? como marco? O banner responde as três
 * antes de qualquer rolagem — bairro e cidade na manchete, os três preços
 * principais no tríptico, e o botão de WhatsApp à vista.
 *
 * A tentação do ramo é o contrário: uma arte grande ocupando a tela inteira e
 * "agende seu horário". Isso responde zero das três, e a pessoa rola ou sai.
 *
 * ── A ARTE CHEGOU, E É POR ISSO QUE ELE TEM DUAS COLUNAS ─────────────────
 * O banner do Enzo (logotipo + ilustração) é a promessa visual do site e por
 * isso entra como PRIMEIRO QUADRO. Mas ele é 16:9: de ponta a ponta, sozinho,
 * passa de 800px de altura num notebook e empurra os preços para fora da
 * tela — exatamente o erro descrito acima. Então arte e respostas DIVIDEM a
 * primeira tela: a imagem de um lado, a manchete e o tríptico do outro. No
 * celular empilha, a arte primeiro.
 *
 * ⚠️ A IMAGEM É MOSTRADA INTEIRA, NUNCA RECORTADA. A composição tem o
 * logotipo à esquerda e a ilustração à direita, e as duas encostam nas
 * bordas: `object-fit: cover` numa caixa mais baixa que 16:9 corta o topo do
 * cabelo e a base da barba, decepando o desenho. Se um dia a altura precisar
 * ceder, o caminho é ESTREITAR a coluna — nunca recortar.
 *
 * ⚠️ A COLUNA É A `wide` (80rem), e não a de texto. É a MESMA largura da
 * barra fixa (`chrome.tsx`), então a borda esquerda do banner cai exatamente
 * embaixo do monograma da barra. As seções abaixo seguem na coluna estreita,
 * de propósito: o quadro de abertura alinha com a moldura do site, o corpo
 * fica no teto de leitura.
 *
 * ⚠️ O NOME NÃO É REPETIDO NA MANCHETE, e a ausência é decisão. O logotipo
 * dentro do banner JÁ escreve "Enzo-Cortes Barbearia" em corpo grande, e a
 * barra fixa escreve de novo logo acima — um `<h1>Enzo Cortes</h1>` ao lado
 * da arte seria a terceira vez na mesma tela. O `<h1>` passa a carregar o
 * RECORTE LOCAL (bairro + cidade), que é a metade da consulta que decide a
 * busca ("barbearia no Jardim Pinheiros") e é a segunda metade do próprio
 * `<title>` da home. A marca continua sendo dita pelo `alt` da imagem, pela
 * barra, pelo `<title>` e pelo JSON-LD.
 *
 * ⚠️ `<img>` COM IMPORT ESTÁTICO, nunca `next/image`. O tema roda DENTRO da
 * aplicação da Freelandoo e é servido em TRÊS origens (plataforma, subdomínio
 * e domínio do cliente): quanto menos peça viva no caminho da primeira
 * imagem, menos coisa pode falhar no domínio de quem paga. E o import
 * estático já entrega a URL com hash de conteúdo, servida como estático
 * imutável de `/_next/static/media/` — que o `proxy.ts` da plataforma exclui
 * do matcher — sem custar uma única transformação de otimizador.
 *
 * ⚠️ OS DOIS WEBP SÃO GERADOS, NÃO EDITADOS À MÃO. A fonte é
 * `images/banner.png` (1920×1080, 3,4 MB) no projeto solto; as derivadas
 * saem dele por `sharp` (larguras 800 e 1200, webp q78 — 121 KB e 245 KB).
 * Trocada a arte, as duas são regeradas e copiadas para as DUAS árvores:
 * elas precisam ser byte a byte iguais, como o resto do tema.
 */

import { BUSINESS, whatsappLink } from "./content/business";
import { getService } from "./content/services";
import { DecoDivider, DecoSunburst } from "./deco";
import { PAGE, brl, pageHref, type TemplateLinks } from "./lib";
import { Btn, Container } from "./ui";

import bannerLg from "./banner-1200.webp";
import bannerSm from "./banner-800.webp";

/**
 * Os três preços do tríptico.
 *
 * ⚠️ SÃO LIDOS DA TABELA, nunca digitados aqui. Escritos à mão, o banner
 * seria a primeira coisa a mentir depois de um reajuste — e é a única parte
 * do site que a pessoa lê com certeza.
 */
const HEADLINE = ["corte-de-cabelo", "barba", "sobrancelha"] as const;

export default function Hero({ links }: { links: TemplateLinks }) {
  const destaques = HEADLINE.map((slug) => getService(slug)).filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  return (
    <section className="relative overflow-hidden pb-16 pt-24 md:pb-24 md:pt-32">
      {/* O raio déco. Fica atrás de tudo e é decorativo — por isso não entra
          na ordem de leitura nem no contraste do texto. Com o banner ocupando
          a coluna da esquerda, o que se vê dele é o leque abrindo atrás da
          manchete, à direita. */}
      <DecoSunburst className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] w-full opacity-70" />

      <Container wide className="relative">
        <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-center md:gap-14">
          {/* ── A ARTE ───────────────────────────────────────────────────
              O fio dourado e os dois cantos marcados vêm do `deco-frame`, a
              mesma moldura dos painéis do site: a arte entra montada como uma
              placa, não colada na página. Os cantos são pseudo-elementos
              posicionados do invólucro, então pintam POR CIMA da imagem. */}
          <figure className="deco-frame" data-reveal="scale">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerLg.src}
              srcSet={`${bannerSm.src} 800w, ${bannerLg.src} 1200w`}
              /* A coluna mede ~37rem no teto de 80rem, ~48vw entre o md e o
                 teto, e a largura da tela quando empilha. Sem isto o navegador
                 assume 100vw sempre e baixa a derivada grande no celular. */
              sizes="(min-width: 1280px) 37rem, (min-width: 768px) 48vw, 100vw"
              width={bannerLg.width}
              height={bannerLg.height}
              alt={`${BUSINESS.name} ${BUSINESS.tagline} — logotipo dourado ao lado da ilustração de um corte com degradê e barba feita.`}
              /* É o elemento de maior pintura da página: `lazy` aqui atrasaria
                 a própria métrica que ele define. */
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full"
            />
          </figure>

          {/* ── AS RESPOSTAS ─────────────────────────────────────────────── */}
          <div className="text-center md:text-left">
            <p className="eyebrow" data-reveal="up">
              {BUSINESS.subTagline}
            </p>

            <h1
              className="display mt-5 text-[clamp(2.125rem,5vw,3.25rem)] text-[var(--ec-cream)]"
              data-reveal="up"
              data-reveal-delay="0.06"
            >
              Barbearia no{" "}
              <span className="display-italic text-[var(--ec-gold-hi)]">
                {BUSINESS.neighborhood}
              </span>
              , {BUSINESS.city}
            </h1>

            <DecoDivider className="mt-7 md:justify-start" />

            <p
              className="mt-7 text-[1.0625rem] leading-relaxed text-[var(--ec-cream-dim)] md:max-w-[30rem]"
              data-reveal="up"
              data-reveal-delay="0.12"
            >
              Preço na mesa, sem pacote e sem fidelidade — está tudo publicado
              aqui embaixo.
            </p>

            {/* O TRÍPTICO: a resposta à segunda pergunta, ainda sem rolar. */}
            <ul
              className="mt-10 grid grid-cols-3 gap-px md:max-w-[30rem]"
              style={{ background: "var(--ec-line-soft)" }}
              data-reveal="up"
              data-reveal-delay="0.18"
            >
              {destaques.map((s) => (
                <li
                  key={s.slug}
                  className="px-2 py-5 text-center"
                  style={{ background: "var(--ec-ink)" }}
                >
                  <span className="display tnum block text-[clamp(1.5rem,5vw,2.25rem)] leading-none text-[var(--ec-gold-hi)]">
                    {brl(s.price)}
                  </span>
                  <span className="mt-2 block text-[0.75rem] uppercase tracking-[0.2em] text-[var(--ec-cream-faint)]">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>

            <div
              className="mt-10 flex flex-wrap items-center justify-center gap-3 md:justify-start"
              data-reveal="up"
              data-reveal-delay="0.24"
            >
              <Btn
                href={whatsappLink("Olá, Enzo! Vi o site e queria marcar um horário.")}
                external
              >
                Marcar no WhatsApp
              </Btn>
              <Btn href={pageHref(links, PAGE.servicos)} variant="ghost">
                Ver a tabela inteira
              </Btn>
            </div>

            <p
              className="mt-8 text-[0.8125rem] leading-relaxed text-[var(--ec-cream-faint)]"
              data-reveal="fade"
              data-reveal-delay="0.3"
            >
              {BUSINESS.street} — {BUSINESS.neighborhood}, {BUSINESS.city}/{BUSINESS.state}
              <span className="mx-2 text-[var(--ec-gold-deep)]">·</span>
              {BUSINESS.hoursShort}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
