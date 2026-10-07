"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Home, Menu, Radio, X } from "lucide-react"

/**
 * Cabeçalho único da Casa Views. Montado pelo layout de /acasaviews, então
 * vale para toda página da seção — inclusive as de ranking que seguem no tema
 * de papel: é ele que costura as duas peles numa experiência só.
 *
 * ⚠️ A navegação lista SÓ o que existe. "Desafios", "Premiação" e a busca
 * aparecem na referência visual e não têm rota nem dado — link para o nada é
 * pior que link nenhum. O menu de três linhas abre em TODA largura (é o
 * desenho da referência); no computador a barra também mostra as seções.
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
  // Hologramas colecionáveis (câmera + vitrine).
  { href: "/acasaviews/ra", label: "RA", match: ["/acasaviews/ra"] },
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
      className="sticky top-0 border-b border-[var(--rv-line)] bg-[rgba(5,5,5,0.94)] text-[var(--rv-white)]"
      style={{ zIndex: "var(--rv-z-header)" }}
    >
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 md:h-16 md:px-8">
        {/* porta de volta para a Freelandoo (a seção não tem o chrome da plataforma) */}
        <Link
          href="/account"
          aria-label="Voltar para a Freelandoo"
          className="hidden h-8 w-8 shrink-0 items-center justify-center text-[var(--rv-faint)] transition-colors hover:text-[var(--rv-white)] sm:inline-flex"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <Link href="/acasaviews/rankings" className="group flex shrink-0 items-center gap-2.5" aria-label="A Casa Views — início">
          <Home className="h-6 w-6 text-[var(--rv-pink)] md:h-7 md:w-7" strokeWidth={2.75} aria-hidden />
          <span className="rv-type text-[13px] font-bold tracking-[0.12em] md:text-[15px]">A CASA VIEWS</span>
        </Link>

        <span aria-hidden className="mx-3 hidden h-7 w-px bg-[var(--rv-line-strong)] lg:block" />

        <nav aria-label="Seções da Casa Views" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => {
            const active = isActive(n.match)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-3.5 py-2 rv-type text-[11px] uppercase transition-colors xl:px-4 ${
                  active ? "rv-glow-text text-[var(--rv-pink-ink)]" : "text-[var(--rv-white)] hover:text-[var(--rv-pink-ink)]"
                }`}
              >
                {n.label}
                {active && (
                  <span aria-hidden className="absolute inset-x-2 -bottom-[13px] h-[3px] bg-[var(--rv-pink)] shadow-[0_0_14px_2px_rgba(255,0,122,0.8)] md:-bottom-[17px]" />
                )}
              </Link>
            )
          })}
        </nav>

        <span aria-hidden className="ml-2 hidden h-7 w-px bg-[var(--rv-line-strong)] lg:block" />

        <div className="ml-auto flex items-center gap-3 md:gap-5">
          <Link
            href="/acasaviews/ranking-participantes"
            aria-label="Ao vivo: placar do dia"
            className="rv-glow-box inline-flex items-center gap-2 bg-[var(--rv-pink)] px-3 py-2 text-[var(--rv-white)] transition-transform hover:-translate-y-0.5 md:px-5 md:py-2.5"
          >
            <Radio className="h-4 w-4 md:h-5 md:w-5" strokeWidth={2.5} aria-hidden />
            <span className="rv-type text-[11px] font-bold tracking-[0.14em] md:text-[13px]">AO VIVO</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="rv-mobile-nav"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="inline-flex h-10 w-10 items-center justify-center text-[var(--rv-white)] hover:text-[var(--rv-pink-ink)]"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-7 w-7" strokeWidth={2.25} />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="rv-mobile-nav"
          aria-label="Seções da Casa Views"
          className="rv-page-in absolute inset-x-0 top-full h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-[var(--rv-line)] bg-[var(--rv-bg)] px-4 pb-10 pt-4 md:h-[calc(100dvh-4rem)]"
        >
          <ul className="mx-auto flex max-w-[1600px] flex-col md:px-4">
            {NAV.map((n, i) => {
              const active = isActive(n.match)
              return (
                <li key={n.href} className="border-b border-[var(--rv-line)]">
                  <Link
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className="flex items-baseline gap-4 py-4"
                  >
                    <span className="rv-type text-xs text-[var(--rv-faint)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className={`rv-wide text-4xl md:text-6xl ${active ? "text-[var(--rv-pink)]" : ""}`}>{n.label}</span>
                  </Link>
                </li>
              )
            })}
            <li>
              <Link href="/account" className="rv-type flex items-center gap-2 py-5 text-xs uppercase text-[var(--rv-muted)]">
                <ArrowLeft className="h-4 w-4" /> Voltar para a Freelandoo
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  )
}
