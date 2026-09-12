"use client"

// A casca do tema `oficina-local`: barra fixa, rodapé e botão flutuante.
//
// ⚠️ O MENU É DERIVADO, nunca um campo. Ele sai dos serviços e das cidades
// cadastrados, e as âncoras saem das seções que a home desenha. Um menu
// guardado à parte seria a segunda verdade de sempre: alguém acrescenta um
// serviço e o menu continua anunciando os cinco antigos — é a mesma razão pela
// qual a casca do construtor lê o WhatsApp da seção de contato em vez de ter
// campo próprio.
//
// ⚠️ E TODO ENDEREÇO VEM DE `links`. O mesmo site é servido em três lugares
// (plataforma, subdomínio e domínio próprio); um "/servicos" escrito à mão
// acertaria em um e daria 404 nos outros dois.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import {
  IconArrowRight,
  IconCard,
  IconChevronDown,
  IconClock,
  IconClose,
  IconMenu,
  IconPhone,
  IconPin,
  IconWhatsapp,
} from "./icons"
import { BrandMark } from "./ui"
import { cityLabel, pageHref, telHref, waLink, waMessageFor, type Ctx } from "./lib"

/** Um item do menu, já com o endereço resolvido. */
type NavItem = { label: string; href: string; anchor?: boolean }

function buildNav(ctx: Ctx): NavItem[] {
  const { data, links } = ctx
  const items: NavItem[] = [{ label: "Início", href: links.home }]
  if (data.services.length) {
    items.push({ label: "Serviços", href: `${links.home}#servicos`, anchor: true })
  }
  if (data.cities.length) {
    items.push({ label: "Áreas atendidas", href: `${links.home}#areas`, anchor: true })
  }
  if (data.reviews.length) {
    items.push({ label: "Avaliações", href: `${links.home}#avaliacoes`, anchor: true })
  }
  items.push({ label: "Contato", href: `${links.home}#contato`, anchor: true })
  return items
}

export function SiteHeader({ ctx }: { ctx: Ctx }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [servicesOpen, setServicesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const { data, links } = ctx
  const b = data.business
  const nav = buildNav(ctx)
  const tel = telHref(b)
  const zap = waLink(b, waMessageFor(data))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  /* Fechar o menu é reação ao CLIQUE, não ao pathname: setState dentro de
     efeito dispara render em cascata (e o lint do React reprova). */
  const closeMenus = () => {
    setOpen(false)
    setServicesOpen(false)
  }

  // trava a rolagem do fundo enquanto o menu móvel está aberto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  /* Âncora nunca fica "ativa": ela leva para um pedaço da home, e acender o
     item o tempo todo em que a home está aberta marcaria quatro itens de uma
     vez. Só página tem estado ativo. */
  const isActive = (item: NavItem) =>
    !item.anchor && (item.href === links.home ? pathname === links.home : pathname === item.href)

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-white/8 bg-[#06060899] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
      style={{ transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
    >
      <div className="fx-shell">
        <div
          className={[
            "flex items-center justify-between gap-6 transition-all duration-500",
            scrolled ? "h-[68px]" : "h-[86px]",
          ].join(" ")}
        >
          <Link
            href={links.home}
            aria-label={`${b.name} — início`}
            className="shrink-0 transition-opacity hover:opacity-90"
          >
            <BrandMark name={b.name} size="sm" />
          </Link>

          {/* ---------- navegação desktop ---------- */}
          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {nav.map((item) =>
              item.label === "Serviços" ? (
                <div
                  key={item.href}
                  className="relative"
                  onMouseEnter={() => setServicesOpen(true)}
                  onMouseLeave={() => setServicesOpen(false)}
                >
                  <Link
                    href={item.href}
                    aria-expanded={servicesOpen}
                    className={[
                      "fx-font-display flex items-center gap-1.5 px-3.5 py-2.5 text-[0.8125rem] font-semibold tracking-[0.1em] uppercase transition-colors",
                      isActive(item)
                        ? "text-[#ffe7a3]"
                        : "text-[#f6f6f7]/78 hover:text-[#ffe7a3]",
                    ].join(" ")}
                    style={{ fontStretch: "94%" }}
                  >
                    {item.label}
                    <IconChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${servicesOpen ? "rotate-180" : ""}`}
                    />
                  </Link>

                  <div
                    className={[
                      "absolute top-full left-0 w-[330px] origin-top pt-2 transition-all duration-300",
                      servicesOpen
                        ? "pointer-events-auto translate-y-0 opacity-100"
                        : "pointer-events-none -translate-y-1 opacity-0",
                    ].join(" ")}
                  >
                    <div className="fx-panel fx-grain relative p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)]">
                      <div className="fx-rule mb-2" />
                      {data.services.map((s) => (
                        <Link
                          key={s.slug}
                          href={pageHref(links, s.slug)}
                          onClick={closeMenus}
                          className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-white/4"
                        >
                          <span className="mt-[7px] h-px w-4 shrink-0 bg-[#f3b73f]/45 transition-all duration-300 group-hover:w-6 group-hover:bg-[#f3b73f]" />
                          <span>
                            <span
                              className="fx-font-display block text-[0.8125rem] font-semibold tracking-wide text-[#f6f6f7] uppercase transition-colors group-hover:text-[#ffe7a3]"
                              style={{ fontStretch: "92%" }}
                            >
                              {s.label}
                            </span>
                            {s.eyebrow ? (
                              <span className="mt-0.5 block text-[0.75rem] leading-snug text-[#6e6e78]">
                                {s.eyebrow}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "fx-font-display px-3.5 py-2.5 text-[0.8125rem] font-semibold tracking-[0.1em] uppercase transition-colors",
                    isActive(item) ? "text-[#ffe7a3]" : "text-[#f6f6f7]/78 hover:text-[#ffe7a3]",
                  ].join(" ")}
                  style={{ fontStretch: "94%" }}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* ---------- ações ---------- */}
          <div className="flex items-center gap-2.5">
            {tel && b.phoneDisplay ? (
              <a
                href={tel}
                className="hidden items-center gap-2 px-3 py-2 text-[0.8125rem] font-medium text-[#f6f6f7]/78 transition-colors hover:text-[#ffe7a3] xl:flex"
                aria-label={`Ligar para ${b.phoneDisplay}`}
              >
                <IconPhone className="h-4 w-4 text-[#f3b73f]" />
                {b.phoneDisplay}
              </a>
            ) : null}

            {links.booking ? (
              <Link
                href={links.booking}
                className="fx-btn fx-btn-gold fx-sheen hidden min-h-[46px] px-5 py-3 lg:inline-flex"
              >
                Agendar online
                <IconArrowRight className="h-4 w-4" />
              </Link>
            ) : zap ? (
              <a
                href={zap}
                target="_blank"
                rel="noopener noreferrer"
                className="fx-btn fx-btn-flame fx-sheen hidden min-h-[46px] px-5 py-3 lg:inline-flex"
              >
                Pedir orçamento
                <IconArrowRight className="h-4 w-4" />
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              aria-controls="menu-mobile-oficina"
              className="flex h-11 w-11 items-center justify-center border border-white/14 text-[#f6f6f7] transition-colors hover:border-[#f3b73f]/60 hover:text-[#ffe7a3] lg:hidden"
            >
              {open ? <IconClose className="h-5 w-5" /> : <IconMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ---------- menu móvel ---------- */}
      <div
        id="menu-mobile-oficina"
        hidden={!open}
        className="fixed inset-x-0 top-[68px] bottom-0 z-40 overflow-y-auto border-t border-white/8 bg-[#05050690] backdrop-blur-2xl lg:hidden"
      >
        <div className="fx-shell py-7">
          <nav aria-label="Principal (móvel)" className="flex flex-col">
            {nav.map((item, i) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMenus}
                  className={[
                    "fx-font-display flex items-center justify-between border-b border-white/7 py-4 text-[1.375rem] uppercase transition-colors",
                    isActive(item) ? "text-[#ffe7a3]" : "text-[#f6f6f7] hover:text-[#ffe7a3]",
                  ].join(" ")}
                  style={{ fontStretch: "86%", fontWeight: 800, letterSpacing: "-0.01em" }}
                >
                  {item.label}
                  <span className="text-[0.6875rem] tracking-widest text-[#6e6e78]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </Link>

                {item.label === "Serviços" ? (
                  <div className="flex flex-col border-b border-white/7 py-2 pl-4">
                    {data.services.map((s) => (
                      <Link
                        key={s.slug}
                        href={pageHref(links, s.slug)}
                        onClick={closeMenus}
                        className="flex items-center gap-2.5 py-2.5 text-[0.9375rem] text-[#9b9ba4] transition-colors hover:text-[#ffe7a3]"
                      >
                        <span className="h-px w-4 bg-[#f3b73f]/50" />
                        {s.label}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {item.label === "Áreas atendidas" ? (
                  <div className="flex flex-col border-b border-white/7 py-2 pl-4">
                    {data.cities.map((c) => (
                      <Link
                        key={c.slug}
                        href={pageHref(links, c.slug)}
                        onClick={closeMenus}
                        className="flex items-center gap-2.5 py-2.5 text-[0.9375rem] text-[#9b9ba4] transition-colors hover:text-[#ffe7a3]"
                      >
                        <span className="h-px w-4 bg-[#f3b73f]/50" />
                        {cityLabel(c)}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>

          <div className="mt-8 flex flex-col gap-3">
            {links.booking ? (
              <Link href={links.booking} onClick={closeMenus} className="fx-btn fx-btn-gold w-full">
                Agendar online
                <IconArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {zap ? (
              <a
                href={zap}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenus}
                className="fx-btn fx-btn-flame w-full"
              >
                Pedir orçamento no WhatsApp
                <IconArrowRight className="h-4 w-4" />
              </a>
            ) : null}
            {tel && b.phoneDisplay ? (
              <a href={tel} className="fx-btn fx-btn-ghost w-full">
                <IconPhone className="h-4 w-4 text-[#f3b73f]" />
                {b.phoneDisplay}
              </a>
            ) : null}
          </div>

          {b.hoursHuman ? (
            <p className="mt-6 text-[0.8125rem] text-[#6e6e78]">
              {[b.hoursHuman, b.closedHuman].filter(Boolean).join(". ")}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export function SiteFooter({ ctx }: { ctx: Ctx }) {
  const { data, links } = ctx
  const b = data.business
  const year = new Date().getFullYear()
  const tel = telHref(b)
  const zap = waLink(b, waMessageFor(data))

  return (
    <footer className="relative mt-24 border-t border-white/8 bg-[#070709]">
      <div aria-hidden className="fx-rule absolute inset-x-0 top-0 opacity-60" />

      <div className="fx-shell py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr_1fr_1.1fr]">
          {/* marca + contato */}
          <div>
            <BrandMark name={b.name} size="md" />
            {b.tagline || b.subTagline ? (
              <p className="mt-6 max-w-xs text-[0.9375rem] leading-relaxed text-[#9b9ba4]">
                {[b.tagline, b.subTagline].filter(Boolean).join(". ")}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col gap-3">
              {zap && b.phoneDisplay ? (
                <a
                  href={zap}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 text-[1.0625rem] font-semibold text-[#f6f6f7] transition-colors hover:text-[#ffe7a3]"
                >
                  <IconWhatsapp className="h-[18px] w-[18px] text-emerald-400" />
                  {b.phoneDisplay}
                </a>
              ) : null}
              {tel ? (
                <a
                  href={tel}
                  className="inline-flex items-center gap-2.5 text-[0.9375rem] text-[#9b9ba4] transition-colors hover:text-[#ffe7a3]"
                >
                  <IconPhone className="h-4 w-4 text-[#f3b73f]/70" />
                  Ligar agora
                </a>
              ) : null}
            </div>
          </div>

          {/* serviços */}
          {data.services.length ? (
            <nav aria-label="Serviços no rodapé">
              <h2 className="fx-eyebrow mb-5">Serviços</h2>
              <ul className="flex flex-col gap-2.5">
                {data.services.map((s) => (
                  <li key={s.slug}>
                    <Link
                      href={pageHref(links, s.slug)}
                      className="text-[0.9375rem] text-[#9b9ba4] transition-colors hover:text-[#ffe7a3]"
                    >
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {/* áreas */}
          {data.cities.length ? (
            <div>
              <h2 className="fx-eyebrow mb-5">Áreas atendidas</h2>
              <ul className="flex flex-col gap-2.5">
                {data.cities.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={pageHref(links, c.slug)}
                      className="text-[0.9375rem] text-[#9b9ba4] transition-colors hover:text-[#ffe7a3]"
                    >
                      {cityLabel(c)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* dados da empresa */}
          <div>
            <h2 className="fx-eyebrow mb-5">Atendimento</h2>

            <ul className="flex flex-col gap-4 text-[0.9375rem] text-[#9b9ba4]">
              {b.hoursHuman ? (
                <li className="flex gap-3">
                  <IconClock className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#f3b73f]/70" />
                  <span>
                    {b.hoursHuman}
                    {b.closedHuman ? (
                      <>
                        <br />
                        <span className="text-[#6e6e78]">{b.closedHuman}</span>
                      </>
                    ) : null}
                  </span>
                </li>
              ) : null}
              {b.street || b.city ? (
                <li className="flex gap-3">
                  <IconPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#f3b73f]/70" />
                  <span>
                    {b.street}
                    {b.street ? <br /> : null}
                    {[b.city && `${b.city}${b.state ? ` — ${b.state}` : ""}`, b.postalCode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </li>
              ) : null}
              {b.payments.length ? (
                <li className="flex gap-3">
                  <IconCard className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#f3b73f]/70" />
                  <span>{b.payments.join(" · ")}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/8 pt-7 text-[0.8125rem] text-[#6e6e78] md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {b.name}
            {b.tagline && b.city ? `. ${b.tagline} em ${b.city} e região.` : "."}
          </p>
          {b.subTagline ? <p>{b.subTagline}</p> : null}
        </div>
      </div>
    </footer>
  )
}

/**
 * Botão flutuante do WhatsApp.
 *
 * ⚠️ A MENSAGEM VEM POR PROP, já escolhida pela página. No projeto de origem
 * ela era derivada do `pathname` — aqui isso não funcionaria: o mesmo site
 * responde em três endereços com prefixos diferentes, e a comparação erraria
 * em dois deles. Quem sabe qual página está aberta é quem a desenhou.
 */
export function WhatsappFab({ href, label }: { href: string | null; label: string }) {
  const [shown, setShown] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 260)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // o rótulo abre sozinho uma vez, alguns segundos depois de aparecer
  useEffect(() => {
    if (!shown) return
    const a = window.setTimeout(() => setExpanded(true), 900)
    const b = window.setTimeout(() => setExpanded(false), 5200)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
    }
  }, [shown])

  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      className={[
        "group fixed right-4 bottom-4 z-50 flex items-center gap-3 border border-emerald-200/25 px-4 text-[#04120a] shadow-[0_18px_44px_-16px_rgba(31,175,82,.75)] transition-all duration-500 md:right-7 md:bottom-7",
        "h-14 min-w-14 justify-center",
        shown
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-6 opacity-0",
      ].join(" ")}
      style={{
        background: "linear-gradient(168deg,#2fd06a 0%,#1faf52 48%,#12803a 100%)",
        transitionTimingFunction: "cubic-bezier(.22,1,.36,1)",
      }}
    >
      <IconWhatsapp className="h-6 w-6 shrink-0" />
      <span
        className={[
          "fx-font-display overflow-hidden text-[0.8125rem] font-bold tracking-[0.08em] whitespace-nowrap uppercase transition-all duration-500",
          expanded ? "max-w-[230px] opacity-100" : "max-w-0 opacity-0",
        ].join(" ")}
        style={{ fontStretch: "92%", transitionTimingFunction: "cubic-bezier(.22,1,.36,1)" }}
      >
        {label}
      </span>

      {/* Brilho pulsante em BOX-SHADOW, nunca em transform.
          Um anel com `scale()` num elemento `fixed` escapa da viewport e abre
          rolagem horizontal no celular (8px, medidos) — e sombra não entra na
          caixa de rolagem do documento. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${expanded ? "opacity-0" : "opacity-100"}`}
        style={{
          animation: expanded ? "none" : "tplOficinaZapGlow 3s ease-in-out infinite",
          transition: "opacity .4s ease",
        }}
      />
    </a>
  )
}
