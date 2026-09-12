// A página de uma cidade atendida.
//
// A MECÂNICA é compartilhada; o CONTEÚDO é próprio de cada cidade (contexto,
// foco, perguntas). É o que evita a armadilha clássica de busca local: quatro
// páginas iguais com o nome da cidade trocado, que o buscador trata como
// conteúdo duplicado — e aí nenhuma delas responde.
//
// ⚠️ O NOME DA CIDADE FICA NO H1 de propósito ("Atendimento em Mogi Guaçu"):
// é o sinal local que o buscador lê. E a página lista as OUTRAS cidades, nunca
// a si mesma — sem isso elas ficariam ilhadas umas das outras, e é justamente
// pelos links entre elas que o cluster geográfico é medido.

import Link from "next/link"

import HowItWorks from "./how-it-works"
import { IconArrowRight, IconClock, IconPin, IconWhatsapp } from "./icons"
import { baseCity, pageHref, telHref, waLink, waMessageFor, type Ctx } from "./lib"
import { otherCities } from "./pages"
import {
  Breadcrumbs,
  CtaBand,
  FaqList,
  Section,
  SectionHead,
  TickList,
  TraitCard,
} from "./ui"
import type { TemplateCity } from "@/types/site-template"

export default function OficinaCityPage({ ctx, city: c }: { ctx: Ctx; city: TemplateCity }) {
  const { data, links } = ctx
  const b = data.business
  const message = waMessageFor(data, c.waMessage)
  const zap = waLink(b, message)
  const tel = telHref(b)
  const others = otherCities(data, c)
  const sede = baseCity(data)
  const prep = c.prep || `em ${c.name}`

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Início", href: links.home },
          { label: c.uf ? `${c.name} — ${c.uf}` : c.name },
        ]}
      />

      {/* ---------------- abertura ---------------- */}
      <Section className="pt-10 pb-20 md:pt-14 md:pb-28">
        <div className="fx-shell">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
            <div>
              <SectionHead
                as="h1"
                eyebrow={c.eyebrow}
                title={c.h1 || `Atendimento ${prep}`}
              />

              <div data-rule aria-hidden className="fx-rule mt-8 max-w-sm" />

              {c.intro.map((p, i) => (
                <p
                  key={i}
                  data-reveal
                  data-reveal-delay={String(0.06 + i * 0.06)}
                  className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-[#9b9ba4] md:text-[1.125rem]"
                >
                  {p}
                </p>
              ))}

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
                    Pedir avaliação {prep}
                  </a>
                ) : null}
                {tel && b.phoneDisplay ? (
                  <a href={tel} className="fx-btn fx-btn-ghost w-full sm:w-auto">
                    {b.phoneDisplay}
                  </a>
                ) : null}
              </div>
            </div>

            <div data-reveal="right" className="fx-panel fx-grain relative p-8 md:p-9">
              <div aria-hidden className="fx-arcs" />
              <div className="relative">
                <span className="flex h-12 w-12 items-center justify-center border border-[#f3b73f]/40 text-[#f3b73f]">
                  <IconPin className="h-6 w-6" />
                </span>

                <h2
                  className="fx-font-display mt-6 text-[1.5rem] leading-tight text-[#f6f6f7] uppercase"
                  style={{ fontStretch: "86%", fontWeight: 800 }}
                >
                  {c.name}
                  {c.uf ? (
                    <span className="ml-2 text-[0.9375rem] text-[#6e6e78]">{c.uf}</span>
                  ) : null}
                </h2>

                <div className="mt-6 border-t border-white/8 pt-6">
                  <TickList
                    items={[
                      // A primeira linha diz de onde o atendimento sai — e a
                      // frase muda conforme esta cidade SEJA ou não a sede.
                      // Escrita fixa, ela afirmaria uma base que não existe na
                      // página das outras três.
                      c.isBase
                        ? b.street
                          ? `Base${b.name ? ` da ${b.name}` : ""}: ${b.street}`
                          : `Cidade-sede do atendimento`
                        : sede
                          ? `Atendimento a partir de ${sede.name}, com hora marcada`
                          : "Atendimento com hora marcada",
                      b.subTagline,
                      b.hoursHuman,
                      b.payments.length ? b.payments.join(" · ") : "",
                    ].filter(Boolean)}
                  />
                </div>

                {b.hoursShort ? (
                  <p className="mt-7 flex items-start gap-3 border-t border-white/8 pt-6 text-[0.875rem] leading-relaxed text-[#6e6e78]">
                    <IconClock className="mt-0.5 h-4 w-4 shrink-0 text-[#f3b73f]/60" />
                    O horário é combinado antes pelo WhatsApp.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- contexto local ---------------- */}
      {c.context.title || c.context.body.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
              <div>
                <SectionHead eyebrow={`Panorama · ${c.name}`} title={c.context.title} />
              </div>
              <div>
                {c.context.body.map((p, i) => (
                  <p
                    key={i}
                    data-reveal
                    data-reveal-delay={String(i * 0.07)}
                    className="mb-6 text-[1.0625rem] leading-relaxed text-[#9b9ba4] last:mb-0 md:text-[1.125rem]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------------- foco de atendimento ---------------- */}
      {c.focus.items.length ? (
        <Section className="py-24 md:py-32">
          <div className="fx-shell">
            <SectionHead
              eyebrow="Atendimento"
              title={c.focus.title || `Como é o atendimento ${prep}`}
              lead={c.focus.lead}
            />

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {c.focus.items.map((it, i) => (
                <TraitCard key={it.title} title={it.title} text={it.text} index={i + 1} />
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------------- serviços atendidos aqui ---------------- */}
      {data.services.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <SectionHead
              eyebrow="Serviços"
              title={
                <>
                  Tudo que é atendido <span className="fx-gold">{prep}</span>
                </>
              }
              lead="As frentes de serviço valem para toda a região atendida. Cada uma tem página própria com o que cobre e quando pedir."
            />

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.services.map((s, i) => (
                <Link
                  key={s.slug}
                  href={pageHref(links, s.slug)}
                  data-reveal
                  data-reveal-delay={String((i % 3) * 0.06)}
                  className="group fx-panel fx-panel-hover fx-bracket relative flex flex-col p-6"
                >
                  {s.eyebrow ? (
                    <p className="text-[0.6875rem] tracking-[0.2em] text-[#f3b73f]/70 uppercase">
                      {s.eyebrow}
                    </p>
                  ) : null}
                  <h3
                    className="fx-font-display mt-2.5 text-[1.0625rem] leading-tight text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                    style={{ fontStretch: "90%", fontWeight: 700 }}
                  >
                    {s.label}
                  </h3>
                  <span className="fx-font-display mt-5 inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.14em] text-[#ffe7a3] uppercase">
                    Ver serviço
                    <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <HowItWorks lead={`Do primeiro contato até o serviço conferido — o mesmo caminho para quem chama ${prep}.`} />

      {/* ---------------- dúvidas ---------------- */}
      {c.faq.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
              <div>
                <SectionHead
                  eyebrow={`Dúvidas · ${c.name}`}
                  title={
                    <>
                      Perguntas <span className="fx-gold">frequentes</span>
                    </>
                  }
                />
              </div>
              <div data-reveal>
                <FaqList items={c.faq} />
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------------- outras cidades ---------------- */}
      {others.length ? (
        <Section className="py-20 md:py-24">
          <div className="fx-shell">
            <SectionHead
              eyebrow="Região"
              title={
                <>
                  Outras cidades <span className="fx-gold">atendidas</span>
                </>
              }
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {others.map((o, i) => (
                <Link
                  key={o.slug}
                  href={pageHref(links, o.slug)}
                  data-reveal
                  data-reveal-delay={String(i * 0.06)}
                  className="group fx-panel fx-panel-hover fx-bracket relative flex items-center justify-between gap-4 p-6"
                >
                  <span className="flex items-center gap-3">
                    <IconPin className="h-5 w-5 text-[#f3b73f]/70" />
                    <span
                      className="fx-font-display text-[1rem] text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                      style={{ fontStretch: "90%", fontWeight: 700 }}
                    >
                      {o.name}
                    </span>
                  </span>
                  <IconArrowRight className="h-4 w-4 text-[#f3b73f]/60 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <CtaBand
        ctx={ctx}
        title={
          <>
            Precisa de atendimento {prep}?
            <br />
            <span className="fx-gold">
              {b.owner ? `Fale com ${b.owner}.` : "Fale com a gente."}
            </span>
          </>
        }
        lead={
          b.hoursHuman
            ? `Descreva o que está acontecendo e combine o horário — ${b.hoursHuman.toLowerCase()}.`
            : "Descreva o que está acontecendo e combine o horário."
        }
        message={message}
      />
    </>
  )
}
