// A página de um serviço.
//
// É uma das duas metades da razão de existir do tema: uma página por serviço e
// uma por cidade é o que responde em busca local. Toda seção some quando o
// campo correspondente vem vazio — o documento é escrito por nós, mas um
// serviço pode nascer só com nome e endereço enquanto o texto não chega.

import Link from "next/link"

import HowItWorks from "./how-it-works"
import ServiceArt from "./service-art"
import { IconArrowRight, IconPin, IconWhatsapp } from "./icons"
import { pageHref, telHref, waLink, waMessageFor, type Ctx } from "./lib"
import { relatedServices } from "./pages"
import {
  Breadcrumbs,
  CtaBand,
  FaqList,
  Section,
  SectionHead,
  TickList,
  TraitCard,
} from "./ui"
import type { TemplateService } from "@/types/site-template"

export default function OficinaServicePage({
  ctx,
  service: s,
}: {
  ctx: Ctx
  service: TemplateService
}) {
  const { data, links } = ctx
  const b = data.business
  const message = waMessageFor(data, s.waMessage)
  const zap = waLink(b, message)
  const tel = telHref(b)
  const related = relatedServices(data, s)

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Início", href: links.home }, { label: s.label }]}
      />

      {/* ---------------- abertura ---------------- */}
      <Section className="pt-10 pb-20 md:pt-14 md:pb-28">
        <div className="fx-shell">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <SectionHead as="h1" eyebrow={s.eyebrow} title={s.h1 || s.label} />

              <div data-rule aria-hidden className="fx-rule mt-8 max-w-sm" />

              {s.intro.map((p, i) => (
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
                    Pedir avaliação
                  </a>
                ) : null}
                {links.booking ? (
                  <Link href={links.booking} className="fx-btn fx-btn-gold w-full sm:w-auto">
                    Agendar online
                  </Link>
                ) : tel && b.phoneDisplay ? (
                  <a href={tel} className="fx-btn fx-btn-ghost w-full sm:w-auto">
                    {b.phoneDisplay}
                  </a>
                ) : null}
              </div>

              {b.hoursShort || b.subTagline ? (
                <p data-reveal="fade" className="mt-7 text-[0.8125rem] tracking-wide text-[#6e6e78]">
                  {[b.hoursShort, b.subTagline].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>

            <div data-reveal="scale" className="relative">
              <ServiceArt
                art={s.art}
                photo={s.photo}
                alt={b.name ? `${s.label} — ${b.name}` : s.label}
                ratio="3/2"
                priority
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ---------------- o problema ---------------- */}
      {s.problem.title || s.problem.body.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
              <div>
                <SectionHead eyebrow="O problema" title={s.problem.title} />
              </div>
              <div>
                {s.problem.body.map((p, i) => (
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

      {/* ---------------- o que o serviço cobre ---------------- */}
      {s.covers.title || s.covers.items.length ? (
        <Section className="py-24 md:py-32">
          <div className="fx-shell">
            <SectionHead
              eyebrow="O serviço"
              title={s.covers.title || `O que ${s.label.toLowerCase()} cobre`}
              lead={s.covers.body[0]}
            />

            {/* Os parágrafos seguintes do bloco não se perdem: o primeiro vira
                a linha de apoio do cabeçalho e o resto continua abaixo dele. */}
            {s.covers.body.slice(1).map((p, i) => (
              <p
                key={i}
                data-reveal
                className="mt-6 max-w-3xl text-[1.0625rem] leading-relaxed text-[#9b9ba4]"
              >
                {p}
              </p>
            ))}

            {s.covers.items.length ? (
              <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {s.covers.items.map((it, i) => (
                  <TraitCard key={it.title} title={it.title} text={it.text} index={i + 1} />
                ))}
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {/* ---------------- quando chamar ---------------- */}
      {s.signs.items.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
              <div>
                <SectionHead
                  eyebrow="Quando solicitar"
                  title={s.signs.title || "Quando chamar"}
                  lead={s.signs.lead}
                />

                {zap ? (
                  <div data-reveal className="mt-9">
                    <a
                      href={zap}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fx-btn fx-btn-ghost"
                    >
                      <IconWhatsapp className="h-[18px] w-[18px]" />
                      Descrever o meu caso
                    </a>
                  </div>
                ) : null}
              </div>

              <div data-reveal="right" className="fx-panel fx-grain relative p-8 md:p-10">
                <div aria-hidden className="fx-arcs" />
                <div className="relative">
                  <TickList items={s.signs.items} />
                </div>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <HowItWorks
        lead={`Do primeiro contato até o serviço conferido — o mesmo caminho para ${s.label.toLowerCase()}.`}
      />

      {/* ---------------- onde é atendido ---------------- */}
      {data.cities.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <SectionHead
              eyebrow="Região"
              title={
                <>
                  Onde este serviço <span className="fx-gold">é atendido</span>
                </>
              }
              lead={`${s.label} nas cidades atendidas${b.name ? ` pela ${b.name}` : ""}.`}
            />

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {data.cities.map((c, i) => (
                <Link
                  key={c.slug}
                  href={pageHref(links, c.slug)}
                  data-reveal
                  data-reveal-delay={String(i * 0.06)}
                  className="group fx-panel fx-panel-hover fx-bracket relative flex items-center justify-between gap-4 p-6"
                >
                  <span className="flex items-center gap-3">
                    <IconPin className="h-5 w-5 text-[#f3b73f]/70" />
                    <span
                      className="fx-font-display text-[1.0625rem] text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                      style={{ fontStretch: "90%", fontWeight: 700 }}
                    >
                      {c.name}
                    </span>
                  </span>
                  <IconArrowRight className="h-4 w-4 text-[#f3b73f]/60 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------------- dúvidas ---------------- */}
      {s.faq.length ? (
        <Section className="py-24 md:py-32">
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
                  lead="O que mais perguntam antes de agendar este serviço."
                />
              </div>
              <div data-reveal>
                <FaqList items={s.faq} />
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* ---------------- veja também ----------------
          ⚠️ A lista é ESCOLHIDA no documento, não os primeiros da lista: a
          barra só mostra quatro itens, e é este bloco que alcança os serviços
          que não cabem no menu. Página que ninguém aponta é página que nem o
          visitante nem o buscador alcançam. */}
      {related.length ? (
        <Section tone="raised" className="py-24 md:py-28">
          <div className="fx-shell">
            <SectionHead
              eyebrow="Também pode interessar"
              title={
                <>
                  Serviços <span className="fx-gold">relacionados</span>
                </>
              }
            />

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r, i) => (
                <article
                  key={r.slug}
                  data-reveal
                  data-reveal-delay={String(i * 0.07)}
                  className="group fx-panel fx-panel-hover fx-bracket relative flex flex-col p-7"
                >
                  {r.eyebrow ? (
                    <p className="text-[0.6875rem] tracking-[0.2em] text-[#f3b73f]/70 uppercase">
                      {r.eyebrow}
                    </p>
                  ) : null}
                  <h3
                    className="fx-font-display mt-2.5 text-[1.125rem] leading-tight text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                    style={{ fontStretch: "88%", fontWeight: 800 }}
                  >
                    <Link href={pageHref(links, r.slug)} className="after:absolute after:inset-0">
                      {r.label}
                    </Link>
                  </h3>
                  {r.cardText ? (
                    <p className="mt-3 flex-1 text-[0.9375rem] leading-relaxed text-[#9b9ba4]">
                      {r.cardText}
                    </p>
                  ) : null}
                  <span className="fx-font-display mt-6 inline-flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.14em] text-[#ffe7a3] uppercase">
                    Saiba mais
                    <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </span>
                </article>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <CtaBand
        ctx={ctx}
        title={
          <>
            Precisa de <span className="fx-gold">{s.label.toLowerCase()}</span>?
            <br />
            {b.owner ? `Fale com ${b.owner}.` : "Fale com a gente."}
          </>
        }
        lead="Descreva o que está acontecendo e receba a orientação inicial antes mesmo da visita."
        message={message}
      />
    </>
  )
}
