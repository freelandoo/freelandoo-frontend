// A ABERTURA — tipografia monumental, a arte oficial e a lâmina 3D.
//
// ── SEM VÍDEO, POR REGRA ─────────────────────────────────────────────────
// O impacto vem da escala do tipo ("ENZO" ocupando a largura), da arte do
// Enzo em metal e do gesto: as letras sobem de dentro de máscaras em menos
// de um segundo, sem bloquear nada — o botão funciona desde o primeiro quadro.
//
// ── O QUE ELE CONTINUA RESPONDENDO ANTES DE ROLAR ────────────────────────
// Onde fica (bairro e cidade), quanto custa (os três preços da régua) e como
// marca (o botão). A estética nova não tirou nenhuma das três respostas da
// primeira tela — elas só mudaram de roupa.
//
// ⚠️ O `<h1>` CONTINUA CARREGANDO O RECORTE LOCAL. As letras de "ENZO" e
// "CORTES" são peças soltas (é o que deixa a máscara e a fragmentação
// existirem) e por isso ficam `aria-hidden`; o texto que o leitor de tela e o
// buscador leem é a frase inteira, dentro do mesmo `<h1>`.
//
// ⚠️ A ARTE É A OFICIAL (logotipo + ilustração do Enzo), e ela é a ÚNICA
// imagem que existe. Não há foto da barbearia; nada de banco de imagens. Ela
// entra dessaturada, em metal, com o dourado por cima (`.art-duo`), para o
// dourado dela não brigar com a paleta nova.

import { BUSINESS, bookingCta } from "../content/business";
import { getService } from "../content/services";
import { brl, type TemplateLinks } from "../lib";
import { Blade } from "./blade";
import HeroFx from "./hero-fx";

import bannerLg from "../banner-1200.webp";
import bannerSm from "../banner-800.webp";

/** Os preços da régua — lidos da tabela, nunca digitados aqui. */
const HEADLINE = ["corte-de-cabelo", "barba", "sobrancelha"] as const;

function Letters({ word, offset = 0 }: { word: string; offset?: number }) {
  return (
    <>
      {word.split("").map((ch, i) => (
        <span key={i} className="hero-mask" data-frag>
          <span className="hero-glyph" style={{ ["--i" as string]: i + offset }}>
            {ch}
          </span>
        </span>
      ))}
    </>
  );
}

/** A régua de horas: marcações reais (09h a 19h), não decoração inventada. */
function HoursRuler() {
  const hours = Array.from({ length: 11 }, (_, i) => 9 + i);
  return (
    <div className="hero-in w-full" style={{ ["--d" as string]: "0.9s" }} aria-hidden="true" data-hero-fade>
      <div className="flex items-end justify-between">
        {hours.map((h) => (
          <div key={h} className="flex flex-col items-center gap-1.5">
            <span
              className="block w-px bg-[var(--ec-line)]"
              style={{ height: h % 2 ? 8 : 14 }}
            />
            <span className="mono text-[0.625rem] text-[var(--ec-metal-dim)]">
              {String(h).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero({ links }: { links: TemplateLinks }) {
  const cta = bookingCta(links);
  const destaques = HEADLINE.map((slug) => getService(slug)).filter(
    (s): s is NonNullable<typeof s> => !!s,
  );

  return (
    <section
      data-hero
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pb-10 pt-24 md:pt-28"
    >
      <HeroFx />

      <div className="relative mx-auto flex w-full max-w-[90rem] flex-1 flex-col" style={{ paddingInline: "var(--ec-pad)" }}>
        {/* ── A LINHA TÉCNICA ─────────────────────────────────────────── */}
        <div
          className="hero-in mono flex items-center justify-between gap-4 border-b border-[var(--ec-line-soft)] pb-3 text-[0.6875rem] uppercase text-[var(--ec-metal)]"
          style={{ ["--d" as string]: "0.2s" }}
          data-hero-fade
        >
          <span>
            <span className="text-[var(--ec-volt)]">EC/01</span> · Barbearia · {BUSINESS.city} — {BUSINESS.state}
          </span>
          <span className="hidden sm:inline">{BUSINESS.hoursShort}</span>
        </div>

        {/* ── O NOME ──────────────────────────────────────────────────── */}
        <h1 className="relative mt-6 md:mt-4">
          <span className="sr-only">
            {BUSINESS.name} — barbearia no {BUSINESS.neighborhood}, {BUSINESS.city}
          </span>
          <span
            aria-hidden="true"
            className="hero-word relative z-10 text-[clamp(6.5rem,38vw,25rem)] text-[var(--ec-paper)] md:text-[clamp(8rem,22vw,20rem)]"
          >
            <Letters word="ENZO" />
          </span>
          <span
            aria-hidden="true"
            data-hero-cortes
            className="hero-word relative z-20 -mt-[0.02em] text-right text-[clamp(4.25rem,25vw,15rem)] text-[var(--ec-volt)] md:text-[clamp(6rem,16vw,14rem)]"
          >
            <Letters word="CORTES" offset={4} />
          </span>
          <span
            aria-hidden="true"
            className="hero-in mono mt-4 block text-[0.75rem] uppercase text-[var(--ec-metal)] md:absolute md:bottom-[18%] md:left-0 md:mt-0 md:max-w-[16rem]"
            style={{ ["--d" as string]: "0.55s" }}
            data-hero-fade
          >
            Barbearia no {BUSINESS.neighborhood}
            <br />
            {BUSINESS.city} / {BUSINESS.state}
          </span>
        </h1>

        {/* ── A ARTE ──────────────────────────────────────────────────────
            No desktop ela fica ATRÁS de "CORTES" (z-0 contra z-20): a palavra
            corta a arte, e é essa sobreposição que dá a profundidade. */}
        <figure
          className="hero-in art-duo relative z-0 mt-8 w-full md:absolute md:right-0 md:top-[5.5rem] md:mt-0 md:w-[42%] lg:w-[34%]"
          style={{ ["--d" as string]: "0.35s" }}
          data-hero-art
        >
          <div data-depth="0.6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerLg.src}
              srcSet={`${bannerSm.src} 800w, ${bannerLg.src} 1200w`}
              sizes="(min-width: 1024px) 36vw, (min-width: 768px) 40vw, 100vw"
              width={bannerLg.width}
              height={bannerLg.height}
              alt={`${BUSINESS.name} ${BUSINESS.tagline} — logotipo ao lado da ilustração de um corte com degradê e barba feita.`}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="block h-auto w-full"
            />
          </div>
          <figcaption className="mono absolute left-3 top-3 bg-[var(--ec-ink)] px-2 py-1 text-[0.625rem] uppercase text-[var(--ec-metal)]">
            Arte oficial · {BUSINESS.name}
          </figcaption>
        </figure>

        {/* ── A LÂMINA ────────────────────────────────────────────────── */}
        <Blade className="hero-in pointer-events-none absolute left-[58%] top-[4.5rem] hidden h-44 w-14 lg:block" />

        {/* ── A RÉGUA DE PREÇOS E A AÇÃO ─────────────────────────────── */}
        <div className="relative z-20 mt-10 grid gap-8 md:mt-auto md:grid-cols-[1fr_auto] md:items-end">
          <ul
            className="hero-in grid grid-cols-3 border-y border-[var(--ec-line-soft)]"
            style={{ ["--d" as string]: "0.7s" }}
            data-hero-fade
          >
            {destaques.map((s, i) => (
              <li key={s.slug} className="border-r border-[var(--ec-line-soft)] px-3 py-4 last:border-r-0 md:px-5">
                <span className="mono block text-[0.625rem] text-[var(--ec-metal-dim)]">
                  {String(i + 1).padStart(2, "0")} · {s.label}
                </span>
                <span className="display tnum mt-1 block text-[clamp(1.75rem,4vw,2.75rem)] leading-none text-[var(--ec-paper)]">
                  {brl(s.price)}
                </span>
              </li>
            ))}
          </ul>

          <div
            className="hero-in flex flex-wrap items-center gap-3"
            style={{ ["--d" as string]: "0.8s" }}
          >
            <span data-magnetic className="inline-block">
              <a
                href={cta.href}
                {...(cta.external ? { target: "_blank", rel: "noopener" } : {})}
                className="btn btn-solid !px-8"
              >
                {cta.label}
                <span aria-hidden="true">→</span>
              </a>
            </span>
            <a href="#servicos" className="btn btn-ghost">
              Ver serviços
            </a>
          </div>
        </div>

        <div className="mt-8 hidden md:block">
          <HoursRuler />
        </div>

        <div
          className="scroll-cue pointer-events-none absolute bottom-0 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
          aria-hidden="true"
          data-hero-fade
        >
          <span />
        </div>
      </div>
    </section>
  );
}
