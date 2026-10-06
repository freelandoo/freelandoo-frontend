"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Menu, X } from "lucide-react"
import { LiveBadge } from "./live-badge"

/**
 * Cabeçalho único da Casa Views. Montado pelo layout de /acasaviews, então
 * vale para toda página da seção — inclusive as de ranking que seguem no tema
 * de papel: é ele que costura as duas peles numa experiência só.
 *
 * ⚠️ A navegação lista SÓ o que existe. "Desafios" e busca apareciam no
 * briefing e não têm rota nem dado — link para o nada é pior que link nenhum.
 */
const NAV = [
  { href: "/acasaviews/rankings", label: "Rankings", match: ["/acasaviews/rankings"] },
  { href: "/acasaviews/ranking-audiencia", label: "Audiência", match: ["/acasaviews/ranking-audiencia"] },
  {
    href: "/acasaviews/ranking-participantes",
    label: "Participantes",
    match: ["/acasaviews/ranking-participantes", "/acasaviews/participantes"],
  },
  { href: "/acasaviews/ranking-geral", label: "Temporada", match: ["/acasaviews/ranking-geral"] },
  { href: "/acasaviews/conveniencia", label: "Conveniência", match: ["/acasaviews/conveniencia"] },
]

export function RealityHeader() {
  const pathname = usePathname() || ""
  const [open, setOpen] = useState(false)

  // Trocar de página fecha o menu (o link já levou a pessoa aonde ela queria).
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const isActive = (m: string[]) => m.some((p) => pathname === p || pathname.startsWith(p + "/"))

  return (
    <header
      className="sticky top-0 border-b border-[var(--rv-line)] bg-[rgba(5,5,5,0.92)] text-[var(--rv-white)]"
      style={{ zIndex: "var(--rv-z-header)" }}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 md:h-16 md:px-8">
        {/* porta de volta para a Freelandoo (a seção não tem o chrome da plataforma) */}
        <Link
          href="/account"
          aria-label="Voltar para a Freelandoo"
          className="hidden h-9 w-9 shrink-0 items-center justify-center border border-[var(--rv-line-strong)] text-[var(--rv-muted)] transition-colors hover:border-[var(--rv-pink)] hover:text-[var(--rv-white)] sm:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <Link href="/acasaviews/rankings" className="group flex shrink-0 items-baseline gap-1.5" aria-label="A Casa Views — início">
          <span className="rv-label text-[9px] text-[var(--rv-pink-ink)]">A</span>
          <span className="rv-display text-[22px] leading-none tracking-wide md:text-[26px]">
            CASA<span className="text-[var(--rv-pink)]">/</span>VIEWS
          </span>
        </Link>

        <nav aria-label="Seções da Casa Views" className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = isActive(n.match)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3 py-2 rv-label text-[11px] transition-colors ${
                  active ? "bg-[var(--rv-pink)] text-[var(--rv-white)]" : "text-[var(--rv-muted)] hover:text-[var(--rv-white)]"
                }`}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <LiveBadge href="/acasaviews/ranking-participantes" />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="rv-mobile-nav"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="inline-flex h-10 w-10 items-center justify-center border border-[var(--rv-line-strong)] lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="rv-mobile-nav"
          aria-label="Seções da Casa Views"
          className="rv-page-in absolute inset-x-0 top-full h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-[var(--rv-line)] bg-[var(--rv-bg)] px-4 pb-10 pt-4 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV.map((n, i) => {
              const active = isActive(n.match)
              return (
                <li key={n.href} className="border-b border-[var(--rv-line)]">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className="flex items-baseline gap-4 py-4"
                  >
                    <span className="rv-mono text-xs text-[var(--rv-faint)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className={`rv-display text-5xl ${active ? "text-[var(--rv-pink)]" : ""}`}>{n.label}</span>
                  </Link>
                </li>
              )
            })}
            <li>
              <Link href="/account" className="flex items-center gap-2 py-5 rv-label text-[var(--rv-muted)]">
                <ArrowLeft className="h-4 w-4" /> Voltar para a Freelandoo
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
