// A home do tema `oficina-local`.
//
// ⚠️ TODO BLOCO SOME QUANDO NÃO TEM DADO. Um site sem depoimento não desenha a
// faixa de depoimento vazia, e um sem cidade não anuncia "áreas atendidas" sem
// nenhuma — é a mesma régua do `sectionHasContent` do construtor, e pelo mesmo
// motivo: cabeçalho órfão anunciando o vazio é pior do que seção nenhuma.
//
// ⚠️ E OS ÂNCORAS SÃO CONTRATO COM A BARRA. `buildNav` (chrome.tsx) oferece
// `#servicos`, `#areas`, `#avaliacoes` e `#contato` exatamente quando o dado
// existe — os ids aqui têm que existir nas MESMAS condições, senão o menu
// oferece um salto que não sai do lugar.

import Link from "next/link"

import HowItWorks from "./how-it-works"
import ServiceArt from "./service-art"
import {
  IconArrowRight,
  IconCard,
  IconClock,
  IconPin,
  IconQuote,
  IconWhatsapp,
} from "./icons"
import { baseCity, cityLabel, pageHref, telHref, waLink, waMessageFor, type Ctx } from "./lib"
import { CtaBand, FaqList, Section, SectionHead, TickList } from "./ui"

export default function OficinaHome({ ctx }: { ctx: Ctx }) {
  const { data, links } = ctx
  const b = data.business
  const sede = baseCity(data)
  const zap = waLink(b, waMessageFor(data))
  const tel = telHref(b)

  // "em Aguaí e região" — derivado, nunca escrito: a preposição vem pronta da
  // cidade (concordância não se concatena) e o "e região" só aparece quando
  // existe mais de uma cidade, que é quando ele é verdade.
  const escopo = sede
    ? `${sede.prep || `em ${sede.name}`}${data.cities.length > 1 ? " e região" : ""}`
    : ""

  return (
    <>
      {/* ===================== BANNER ===================== */}
      <section className="relative min-h-[94svh] overflow-hidden">
        {b.heroPhoto ? (
          <div className="absolute inset-0 lg:left-[38%]">
            <div className="relative h-full w-full" data-parallax="5">
              {/* `<img>` e não `next/image`: a foto vem de uma URL qualquer do
                  documento, e o otimizador do Next RECUSA host que não esteja
                  em `remotePatterns` — com erro de runtime, ou seja, derrubando
                  a home do cliente por causa de onde a imagem está hospedada.
                  Mesma decisão da placa de serviço. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.heroPhoto}
                alt={b.owner ? `${b.owner} — ${b.name}` : b.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-full w-full object-cover object-[62%_center] lg:object-[46%_center]"
              />
            </div>

            {/* Os véus devolvem o preto profundo sob o texto. Três, e não um:
                no computador o texto ocupa a esquerda (gradiente horizontal),
                a página precisa fechar em preto embaixo (vertical), e no
                celular o texto assenta SOBRE a foto — daí o terceiro, só lá. */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, #050506 0%, rgba(5,5,6,.97) 20%, rgba(5,5,6,.72) 38%, rgba(5,5,6,.12) 62%, rgba(5,5,6,0) 78%, rgba(5,5,6,.30) 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(5,5,6,.88) 0%, rgba(5,5,6,.20) 30%, rgba(5,5,6,.40) 66%, #050506 100%)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 lg:hidden"
              style={{ background: "rgba(5,5,6,.50)" }}
            />
          </div>
        ) : null}

        {/* Arcos concêntricos — a assinatura do tema. Ficam FORA do `if` da
            foto: sem retrato eles são o que sustenta o banner sozinho. */}
        <div aria-hidden className="fx-arcs" />

        <div className="fx-shell relative flex min-h-[94svh] items-end pt-[132px] pb-16 md:items-center md:pb-24">
          <div className="w-full max-w-2xl">
            {b.name ? (
              <p
                data-reveal="fade"
                className="fx-font-display flex items-center gap-3 text-[0.6875rem] tracking-[0.3em] text-[#f3b73f] uppercase"
                style={{ fontWeight: 700 }}
              >
                <span aria-hidden className="block h-px w-10 bg-[#f3b73f]/70" />
                {b.name}
              </p>
            ) : null}

            <h1
              data-reveal
              data-reveal-delay="0.06"
              className="fx-display-tight mt-6 text-[2.375rem] leading-[0.93] sm:text-[3.25rem] lg:text-[4.25rem]"
            >
              <span className="fx-silver block">{b.tagline || b.name}</span>
              {escopo ? <span className="fx-gold block">{escopo}</span> : null}
              {b.subTagline ? (
                <span
                  className="mt-5 block text-[1.375rem] leading-[1.2] text-[#f6f6f7] normal-case sm:text-[1.75rem] lg:text-[2.125rem]"
                  style={{ fontStretch: "100%", letterSpacing: "-0.005em", fontWeight: 700 }}
                >
                  {b.subTagline}
                </span>
              ) : null}
            </h1>

            <div data-rule aria-hidden className="fx-rule mt-8 max-w-sm" />

            <div
              data-reveal
              data-reveal-delay="0.2"
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              {zap ? (
                <a
                  href={zap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fx-btn fx-btn-flame fx-sheen w-full sm:w-auto"
                >
                  <IconWhatsapp className="h-[18px] w-[18px]" />
                  Pedir orçamento no WhatsApp
                </a>
              ) : null}
              {links.booking ? (
                <Link href={links.booking} className="fx-btn fx-btn-gold w-full sm:w-auto">
                  Agendar online
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              ) : data.services.length ? (
                <a href={`${links.home}#servicos`} className="fx-btn fx-btn-ghost w-full sm:w-auto">
                  Conhecer os serviços
                  <IconArrowRight className="h-4 w-4" />
                </a>
              ) : null}
            </div>

            {b.hoursShort || b.subTagline || sede ? (
              <p
                data-reveal="fade"
                data-reveal-delay="0.28"
                className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.8125rem] tracking-wide text-[#6e6e78]"
              >
                {[b.hoursShort, b.subTagline, sede ? cityLabel(sede) : ""]
                  .filter(Boolean)
                  .map((t, i, arr) => (
                    <span key={`${t}-${i}`} className={i === 0 ? "text-[#f6f6f7]/70" : ""}>
                      {t}
                      {i < arr.length - 1 ? (
                        <span aria-hidden className="ml-3 text-[#f3b73f]/50">
                          •
                        </span>
                      ) : null}
                    </span>
                  ))}
              </p>
            ) : null}
          </div>
        </div>

        <div aria-hidden className="fx-rule absolute inset-x-0 bottom-0 opacity-60" />
      </section>

      {/* ===================== SERVIÇOS ===================== */}
      {data.services.length ? (
        <Section id="servicos" tone="raised" className="py-24 md:py-32">
          <div className="fx-shell">
            <SectionHead
              eyebrow="O que fazemos"
              title={
                <>
                  Nossos <span className="fx-gold">serviços</span>
                </>
              }
              lead="Cada serviço tem uma página própria com o que ele cobre, quando pedir e como funciona."
            />

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.services.map((s, i) => (
                <article
                  key={s.slug}
                  data-reveal
                  data-reveal-delay={String((i % 3) * 0.08)}
                  className="group fx-panel fx-panel-hover fx-bracket relative flex flex-col"
                >
                  {/* O link do título é esticado sobre o card inteiro
                      (`after:inset-0`), então a placa não leva — e não pode
                      levar — um segundo link: dois links para o mesmo destino
                      no mesmo card são duas paradas do leitor de tela. */}
                  <ServiceArt art={s.art} photo={s.photo} alt={s.label} ratio="4/3" />

                  <div className="flex flex-1 flex-col p-6 md:p-7">
                    {s.eyebrow ? (
                      <p className="text-[0.6875rem] tracking-[0.2em] text-[#f3b73f]/70 uppercase">
                        {s.eyebrow}
                      </p>
                    ) : null}
                    <h3
                      className="fx-font-display mt-2.5 text-[1.1875rem] leading-tight text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                      style={{ fontStretch: "88%", fontWeight: 800 }}
                    >
                      <Link
                        href={pageHref(links, s.slug)}
                        className="after:absolute after:inset-0"
                      >
                        {s.label}
                      </Link>
                    </h3>
                    {s.cardText ? (
                      <p className="mt-3.5 flex-1 text-[0.9375rem] leading-relaxed text-[#9b9ba4]">
                        {s.cardText}
                      </p>
                    ) : null}
                    <span className="fx-font-display mt-6 inline-flex items-center gap-2.5 text-[0.75rem] font-bold tracking-[0.14em] text-[#ffe7a3] uppercase">
                      Saiba mais
                      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <HowItWorks />

      {/* ===================== DEPOIMENTOS ===================== */}
      {data.reviews.length ? (
        <Section id="avaliacoes" tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <div data-reveal="scale" className="fx-panel fx-grain relative overflow-hidden">
              <div aria-hidden className="fx-arcs" />
              <div className="relative grid gap-10 p-8 md:grid-cols-[auto_1fr] md:items-center md:gap-14 md:p-16">
                <IconQuote className="h-12 w-12 text-[#f3b73f] md:h-16 md:w-16" />
                <div>
                  <blockquote>
                    <p
                      className="fx-font-display text-[1.625rem] leading-[1.2] text-[#f6f6f7] sm:text-[2.125rem] lg:text-[2.625rem]"
                      style={{ fontStretch: "88%", fontWeight: 700 }}
                    >
                      “{data.reviews[0].quote}”
                    </p>
                  </blockquote>
                  <p className="mt-6 text-[0.8125rem] tracking-[0.16em] text-[#f3b73f]/80 uppercase">
                    {data.reviews[0].source}
                  </p>
                  {data.googleProfileUrl ? (
                    <div className="mt-7">
                      <a
                        href={data.googleProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fx-font-display group inline-flex items-center gap-2.5 text-[0.8125rem] font-bold tracking-[0.12em] text-[#ffe7a3] uppercase transition-colors hover:text-[#f6f6f7]"
                        style={{ fontStretch: "94%" }}
                      >
                        Ver no Google
                        <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {/* As demais: uma grade discreta, sem competir com a que abre. */}
            {data.reviews.length > 1 ? (
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {data.reviews.slice(1, 7).map((r, i) => (
                  <figure
                    key={`${r.source}-${i}`}
                    data-reveal
                    data-reveal-delay={String((i % 3) * 0.07)}
                    className="fx-panel fx-panel-hover relative p-7"
                  >
                    <blockquote className="text-[0.9375rem] leading-relaxed text-[#9b9ba4]">
                      “{r.quote}”
                    </blockquote>
                    <figcaption className="mt-5 text-[0.6875rem] tracking-[0.18em] text-[#f3b73f]/70 uppercase">
                      {r.source}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ===================== ÁREAS ATENDIDAS ===================== */}
      {data.cities.length ? (
        <Section id="areas" className="py-24 md:py-32">
          <div className="fx-shell">
            <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
              <div>
                <SectionHead
                  eyebrow="Onde atendemos"
                  title={
                    sede ? (
                      <>
                        {sede.name} e <span className="fx-gold">região</span>
                      </>
                    ) : (
                      <>
                        Áreas <span className="fx-gold">atendidas</span>
                      </>
                    )
                  }
                  lead={
                    sede
                      ? `A base fica ${sede.prep || `em ${sede.name}`}, e o atendimento alcança as cidades vizinhas.`
                      : undefined
                  }
                />

                {b.hoursHuman || b.subTagline || b.payments.length ? (
                  <div data-reveal className="mt-8">
                    <TickList
                      items={[
                        b.hoursHuman,
                        b.subTagline,
                        b.payments.length ? b.payments.join(" · ") : "",
                      ].filter(Boolean)}
                    />
                  </div>
                ) : null}

                {zap ? (
                  <div data-reveal className="mt-9">
                    <a
                      href={zap}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fx-btn fx-btn-ghost"
                    >
                      <IconWhatsapp className="h-[18px] w-[18px]" />
                      Confirmar se atende a minha cidade
                    </a>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {data.cities.map((c, i) => (
                  <Link
                    key={c.slug}
                    href={pageHref(links, c.slug)}
                    data-reveal
                    data-reveal-delay={String((i % 2) * 0.08)}
                    className="group fx-panel fx-panel-hover fx-bracket relative flex flex-col justify-between p-7"
                  >
                    <div>
                      <span className="flex items-center gap-2.5 text-[0.6875rem] tracking-[0.2em] text-[#f3b73f]/70 uppercase">
                        <IconPin className="h-4 w-4" />
                        {c.eyebrow || "Área atendida"}
                      </span>
                      <h3
                        className="fx-font-display mt-4 text-[1.375rem] leading-tight text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                        style={{ fontStretch: "86%", fontWeight: 800 }}
                      >
                        {c.name}
                        {c.uf ? (
                          <span className="ml-2 text-[0.875rem] text-[#6e6e78]">{c.uf}</span>
                        ) : null}
                      </h3>
                      {c.cardText ? (
                        <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#9b9ba4]">
                          {c.cardText}
                        </p>
                      ) : null}
                    </div>
                    <span className="fx-font-display mt-6 inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.14em] text-[#ffe7a3] uppercase">
                      Ver a página
                      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ===================== PERGUNTAS ===================== */}
      {data.faq.length ? (
        <Section tone="raised" className="py-24 md:py-32">
          <div className="fx-shell">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <SectionHead
                  eyebrow="Dúvidas"
                  title={
                    <>
                      Perguntas <span className="fx-gold">frequentes</span>
                    </>
                  }
                  lead="O que mais perguntam antes de chamar."
                />
              </div>
              <div data-reveal>
                <FaqList items={data.faq} />
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ===================== CONTATO ===================== */}
      <Section id="contato" className="py-20 md:py-24">
        <div className="fx-shell">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              b.hoursHuman
                ? {
                    Icon: IconClock,
                    t: "Horário",
                    d: [b.hoursHuman, b.closedHuman].filter(Boolean).join(". "),
                  }
                : null,
              b.street || b.city
                ? {
                    Icon: IconPin,
                    t: "Base",
                    d: [b.street, [b.city, b.state].filter(Boolean).join("/"), b.postalCode]
                      .filter(Boolean)
                      .join(" — "),
                  }
                : null,
              b.phoneDisplay
                ? {
                    Icon: IconWhatsapp,
                    t: "Contato",
                    d: `${b.phoneDisplay} — WhatsApp e telefone.`,
                  }
                : b.payments.length
                  ? { Icon: IconCard, t: "Pagamento", d: b.payments.join(", ") + "." }
                  : null,
            ]
              .filter((c): c is { Icon: typeof IconClock; t: string; d: string } => !!c)
              .map((c, i) => (
                <div
                  key={c.t}
                  data-reveal
                  data-reveal-delay={String(i * 0.07)}
                  className="fx-panel flex gap-5 p-7"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#f3b73f]/35 text-[#f3b73f]">
                    <c.Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="fx-eyebrow">{c.t}</h3>
                    <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[#9b9ba4]">{c.d}</p>
                  </div>
                </div>
              ))}
          </div>

          {tel && b.phoneDisplay ? (
            <p data-reveal className="mt-8 text-center text-[0.875rem] text-[#6e6e78]">
              Prefere falar por telefone? Ligue para{" "}
              <a href={tel} className="text-[#ffe7a3] underline-offset-4 hover:underline">
                {b.phoneDisplay}
              </a>
              .
            </p>
          ) : null}
        </div>
      </Section>

      <CtaBand
        ctx={ctx}
        title={
          <>
            Precisa de um atendimento?
            <br />
            <span className="fx-gold">
              {b.owner ? `Fale com ${b.owner}.` : "Fale com a gente."}
            </span>
          </>
        }
        lead="Descreva o que está acontecendo e receba a orientação inicial antes mesmo da visita."
        message={waMessageFor(data)}
      />
    </>
  )
}
