// Blocos reutilizados pelas páginas do tema `oficina-local`.
// Componentes de servidor — nada aqui precisa de JS no cliente.

import Link from "next/link"

import { IconArrowRight, IconChevronDown, IconWhatsapp } from "./icons"
import { telHref, waLink, type Ctx } from "./lib"
import { brandLines } from "./lib"

export function Section({
  children,
  className = "",
  id,
  tone = "plain",
}: {
  children: React.ReactNode
  className?: string
  id?: string
  tone?: "plain" | "raised"
}) {
  return (
    <section
      id={id}
      className={[
        "relative",
        tone === "raised" ? "border-y border-white/6 bg-[#08080a99]" : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  )
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <p className={`fx-eyebrow flex items-center gap-3 ${className}`}>
      <span aria-hidden className="block h-px w-8 bg-[#f3b73f]/70" />
      {children}
    </p>
  )
}

/** Cabeçalho de seção: olho → título grande → linha de apoio. */
export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "left",
  as: As = "h2",
  className = "",
}: {
  eyebrow?: string
  title: React.ReactNode
  lead?: React.ReactNode
  align?: "left" | "center"
  as?: "h1" | "h2" | "h3"
  className?: string
}) {
  return (
    <div
      className={[
        align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl",
        className,
      ].join(" ")}
    >
      {eyebrow ? (
        <div data-reveal="fade">
          {align === "center" ? (
            <p className="fx-eyebrow flex items-center justify-center gap-3">
              <span aria-hidden className="block h-px w-8 bg-[#f3b73f]/70" />
              {eyebrow}
              <span aria-hidden className="block h-px w-8 bg-[#f3b73f]/70" />
            </p>
          ) : (
            <Eyebrow>{eyebrow}</Eyebrow>
          )}
        </div>
      ) : null}

      <As
        data-reveal
        className="fx-display mt-5 text-[2rem] text-[#f6f6f7] sm:text-[2.75rem] lg:text-[3.375rem]"
      >
        {title}
      </As>

      {lead ? (
        <p
          data-reveal
          data-reveal-delay="0.08"
          className={`mt-6 text-[1.0625rem] leading-relaxed text-[#9b9ba4] md:text-[1.125rem] ${
            align === "center" ? "mx-auto" : ""
          }`}
        >
          {lead}
        </p>
      ) : null}
    </div>
  )
}

/**
 * Faixa de chamada para ação — fecha as páginas.
 *
 * Os dois botões degradam sozinhos: sem WhatsApp cadastrado não há o verde,
 * sem telefone não há o de ligar. Um botão que abre o nada é pior do que um
 * botão a menos.
 */
export function CtaBand({
  ctx,
  title,
  lead,
  message,
  compact = false,
}: {
  ctx: Ctx
  title: React.ReactNode
  lead?: string
  message: string
  compact?: boolean
}) {
  const b = ctx.data.business
  const zap = waLink(b, message)
  const tel = telHref(b)

  return (
    <Section className={compact ? "py-16" : "py-20 md:py-28"}>
      <div className="fx-shell">
        <div
          data-reveal="scale"
          className="fx-panel fx-grain relative overflow-hidden px-6 py-14 text-center md:px-16 md:py-20"
        >
          <div aria-hidden className="fx-arcs" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-24 h-48 opacity-70"
            style={{
              background:
                "radial-gradient(60% 100% at 50% 100%, rgba(224,48,30,.28), transparent 70%)",
            }}
          />

          <div className="relative">
            <h2 className="fx-display mx-auto max-w-3xl text-[1.875rem] text-[#f6f6f7] sm:text-[2.5rem] lg:text-[3rem]">
              {title}
            </h2>
            {lead ? (
              <p className="mx-auto mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-[#9b9ba4]">
                {lead}
              </p>
            ) : null}

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {zap ? (
                <a
                  href={zap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fx-btn fx-btn-flame fx-sheen w-full sm:w-auto"
                >
                  <IconWhatsapp className="h-[18px] w-[18px]" />
                  Chamar no WhatsApp
                </a>
              ) : null}
              {tel && b.phoneDisplay ? (
                <a href={tel} className="fx-btn fx-btn-ghost w-full sm:w-auto">
                  {b.phoneDisplay}
                </a>
              ) : null}
              {ctx.links.booking ? (
                <Link href={ctx.links.booking} className="fx-btn fx-btn-gold w-full sm:w-auto">
                  Agendar online
                </Link>
              ) : null}
            </div>

            {b.hoursShort || b.subTagline ? (
              <p className="mt-7 text-[0.8125rem] tracking-wide text-[#6e6e78]">
                {[b.hoursShort, b.subTagline].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </Section>
  )
}

/** Trilha de navegação. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Trilha de navegação" className="fx-shell pt-[104px] md:pt-[124px]">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.75rem] tracking-wide text-[#6e6e78] uppercase">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center gap-2">
            {it.href ? (
              <Link href={it.href} className="transition-colors hover:text-[#ffe7a3]">
                {it.label}
              </Link>
            ) : (
              <span className="text-[#9b9ba4]">{it.label}</span>
            )}
            {i < items.length - 1 ? (
              <span aria-hidden className="text-[#f3b73f]/40">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Acordeão de perguntas — `<details>` nativo: acessível e sem JS. */
export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-white/8 border-y border-white/8">
      {items.map((f) => (
        <details key={f.q} className="group">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 transition-colors hover:text-[#ffe7a3] [&::-webkit-details-marker]:hidden">
            <h3
              className="fx-font-display text-[1.0625rem] leading-snug font-semibold text-[#f6f6f7] transition-colors group-hover:text-[#ffe7a3] md:text-[1.1875rem]"
              style={{ fontStretch: "94%" }}
            >
              {f.q}
            </h3>
            <IconChevronDown className="mt-1 h-5 w-5 shrink-0 text-[#f3b73f] transition-transform duration-300 group-open:rotate-180" />
          </summary>
          <p className="max-w-3xl pb-7 text-[1rem] leading-relaxed text-[#9b9ba4]">{f.a}</p>
        </details>
      ))}
    </div>
  )
}

/** Lista de marcadores com traço dourado. */
export function TickList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-3.5 ${className}`}>
      {items.map((t) => (
        <li key={t} className="flex gap-3.5 text-[1rem] leading-relaxed text-[#9b9ba4]">
          <span aria-hidden className="mt-[11px] h-px w-5 shrink-0 bg-[#f3b73f]/70" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  )
}

/** Link com seta — usado em "Saiba mais". */
export function ArrowLink({
  href,
  children,
  className = "",
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`fx-font-display group inline-flex items-center gap-2.5 text-[0.8125rem] font-bold tracking-[0.12em] text-[#ffe7a3] uppercase transition-colors hover:text-[#f6f6f7] ${className}`}
      style={{ fontStretch: "94%" }}
    >
      {children}
      <IconArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
    </Link>
  )
}

/** Cartão de atributo (o que compõe um serviço). */
export function TraitCard({
  title,
  text,
  index,
}: {
  title: string
  text: string
  index?: number
}) {
  return (
    <div data-reveal className="fx-panel fx-panel-hover fx-bracket relative p-7">
      {typeof index === "number" ? (
        <span className="fx-font-display block text-[0.6875rem] tracking-[0.2em] text-[#f3b73f]/60">
          {String(index).padStart(2, "0")}
        </span>
      ) : null}
      <h3
        className="fx-font-display mt-3 text-[1.0625rem] leading-tight text-[#f6f6f7] uppercase"
        style={{ fontStretch: "90%", fontWeight: 700 }}
      >
        {title}
      </h3>
      <p className="mt-3 text-[0.9375rem] leading-relaxed text-[#9b9ba4]">{text}</p>
    </div>
  )
}

/**
 * Assinatura da marca, reconstruída em TEXTO (não em imagem) para ficar nítida
 * em qualquer tela e legível para a busca.
 *
 * A primeira palavra em ouro, o resto em prata — o lettering do desenho. Nome
 * de uma palavra só desenha uma linha, em vez de deixar um vazio embaixo.
 */
export function BrandMark({
  name,
  tagline,
  size = "md",
  withTagline = false,
  className = "",
}: {
  name: string
  tagline?: string
  size?: "sm" | "md" | "lg"
  withTagline?: boolean
  className?: string
}) {
  const { top, bottom } = brandLines(name)
  const scale =
    size === "lg"
      ? "text-[2.25rem] sm:text-[3rem] lg:text-[3.75rem]"
      : size === "sm"
        ? "text-[1.0625rem]"
        : "text-[1.375rem] sm:text-[1.5rem]"

  return (
    <span className={`relative inline-flex items-center gap-3 ${className}`}>
      {/* colchete dourado — o mesmo do banner */}
      <span
        aria-hidden
        className="relative block self-stretch"
        style={{
          width: size === "sm" ? 7 : size === "lg" ? 16 : 10,
          borderLeft: "1px solid rgba(243,183,63,.85)",
          borderTop: "1px solid rgba(243,183,63,.85)",
          borderBottom: "1px solid rgba(243,183,63,.85)",
          transform: "skewX(-12deg)",
        }}
      />
      {/* leading-[1.06]: o TIL do "Õ" precisa de altura entre a base da primeira
          linha e o topo da segunda. São dois problemas distintos e os dois já
          morderam: o RECORTE (resolvido no .fx-gold/.fx-silver, que é o
          background-clip) e ESTE, de ESPAÇO — com 0.95 o til encosta na linha
          de cima. Medido: 0.95 e 1.02 colidem, 1.06 libera sem afrouxar. */}
      <span className={`flex flex-col leading-[1.06] ${scale}`}>
        <span className="fx-display fx-gold" style={{ fontStretch: "82%", letterSpacing: "0.01em" }}>
          {top}
        </span>
        {bottom ? (
          <span
            className="fx-display fx-silver italic"
            style={{ fontStretch: "78%", letterSpacing: "0.005em", fontWeight: 900 }}
          >
            {bottom}
          </span>
        ) : null}
        {withTagline && tagline ? (
          <span
            className="fx-font-body mt-2 text-[0.6875rem] font-medium tracking-[0.2em] text-[#9b9ba4] uppercase not-italic"
            style={{ lineHeight: 1.4 }}
          >
            {tagline}
          </span>
        ) : null}
      </span>
    </span>
  )
}
