"use client"

// Carteira do user — extrato de ganhos (Loja/Serviço/Curso/Afiliado) escopável
// por subperfil + gráfico de barras (ganhos × dias) + sidebar de mercado.
// IDENTIDADE TABLOIDE (igual ranking/Casa Views/Mensagens): canvas warm escuro
// + textura, manchete condensada fl-display, eyebrow manuscrito fl-marker,
// cards de papel com cantos RETOS e sombra dura preta (hover vira sombra verde).
// Acento = teal-verde (no lugar do dourado do ranking).
//
// Custo Vercel: mercado vem do cache do backend (scheduler Railway) via
// /api/market/snapshot com ISR. Sem polling, sem fetch externo por request.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import {
  Wallet, ArrowLeft, ShoppingBag, Briefcase, GraduationCap, Percent,
  TrendingUp, TrendingDown, Newspaper, ChevronDown, X,
  Loader2, AlertCircle, Inbox, BarChart3, LineChart,
} from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { Halftone, Underline } from "@/components/home/landing/primitives"
import { cn } from "@/lib/utils"

/* ── paleta (verde teal no lugar do dourado) ──────────────────────────────── */
const GREEN = "#16B79A"
const GREEN_DEEP = "#00876B"
const INK = "#0B0B0D"
const PAPER = "#F1EDE2"

/* ── helpers ──────────────────────────────────────────────────────────────── */
function brl(cents?: number | null) {
  return ((Number(cents) || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function pct(n?: number | null) {
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
}
function shortDay(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}
function fmtDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

const KIND_META: Record<string, { label: string; Icon: typeof ShoppingBag }> = {
  product: { label: "Loja", Icon: ShoppingBag },
  service: { label: "Serviço", Icon: Briefcase },
  course: { label: "Curso", Icon: GraduationCap },
  affiliate: { label: "Afiliado", Icon: Percent },
}
const STATUS_META: Record<string, { label: string; cls: string }> = {
  paid: { label: "Recebido", cls: "bg-[#00876B] text-white" },
  available: { label: "Disponível", cls: "bg-[#16B79A] text-[#06251F]" },
  pending: { label: "Aguardando", cls: "bg-[#0B0B0D] text-[#F1EDE2]" },
  reversed: { label: "Revertido", cls: "bg-[#9A3412] text-white" },
}

/* ── tipos ────────────────────────────────────────────────────────────────── */
type Agg = { totals?: { received?: number; available?: number; pending?: number; reversed?: number; count?: number } }
type Earning = {
  kind: string; id: string; ref_id: string; title: string; status: string
  gross_cents: number; net_cents: number; created_at: string
  available_at: string | null; paid_at: string | null
}
type SeriesPoint = { day: string; net_cents: number; count: number }
type MarketItem = {
  symbol: string; kind: string; label: string; price: number | null
  change_pct: number | null; currency: string; logo_url: string | null
}
type NewsItem = { id: number; source?: string; category: string; title: string; url: string; thumb_url?: string | null; published_at?: string | null }

const RANGES = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
]
const KIND_FILTERS = [
  { key: "all", label: "Todos" },
  { key: "product", label: "Loja" },
  { key: "service", label: "Serviço" },
  { key: "course", label: "Curso" },
  { key: "affiliate", label: "Afiliado" },
]

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const { perfil, isLoading: perfilLoading } = useMeProfile()
  const subprofiles = useMemo(() => (perfil?.profiles || []).filter((p) => !p.is_clan), [perfil])

  const [profileId, setProfileId] = useState<string>("")
  const [range, setRange] = useState("30d")
  const [kind, setKind] = useState("all")

  const [agg, setAgg] = useState<Agg | null>(null)
  const [items, setItems] = useState<Earning[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null)

  const load = useCallback(
    async (pg: number, replace: boolean) => {
      const t = token()
      if (!t) return
      if (replace) setLoading(true)
      setError("")
      const pq = profileId ? `&profile=${encodeURIComponent(profileId)}` : ""
      const kq = kind && kind !== "all" ? `&kind=${kind}` : ""
      try {
        const [eRes, sRes] = await Promise.all([
          clientFetchWithTimeout(`/api/me/earnings?page=${pg}&per_page=24${pq}${kq}`, { headers: { Authorization: `Bearer ${t}` } }, 9000),
          replace
            ? clientFetchWithTimeout(`/api/me/earnings/series?range=${range}${pq}`, { headers: { Authorization: `Bearer ${t}` } }, 9000)
            : Promise.resolve(null),
        ])
        if (!eRes.ok) throw new Error("Falha ao carregar extrato")
        const eData = await eRes.json()
        setAgg(eData.aggregates || null)
        setTotalPages(eData.pagination?.total_pages || 1)
        setItems((prev) => (replace ? eData.items || [] : [...prev, ...(eData.items || [])]))
        if (sRes && sRes.ok) setSeries((await sRes.json()).series || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar")
      } finally {
        setLoading(false)
      }
    },
    [profileId, range, kind]
  )

  useEffect(() => {
    setPage(1)
    void load(1, true)
  }, [load])

  const totals = agg?.totals || {}

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-9 md:px-8 md:pt-12">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C9C2B6] transition hover:text-[#F1EDE2]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Link>
          {perfil?.username && (
            <span className="inline-flex items-center gap-2 bg-[#0B0B0D] px-3 py-1.5 text-[#F1EDE2]">
              <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: GREEN }} />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">@{perfil.username}</span>
            </span>
          )}
        </div>

        <p className="fl-marker text-2xl" style={{ color: GREEN }}>a sua grana</p>
        <h1 className="relative">
          <span className="fl-display block text-[16vw] leading-[0.84] text-[#F1EDE2] sm:text-[11vw] lg:text-[6.5rem]">
            Carteira<span style={{ color: GREEN }}>.</span>
          </span>
          <Underline className="absolute -bottom-2 left-1 h-4 w-[46%] max-w-[280px]" style={{ color: GREEN }} />
        </h1>
      </section>

      {/* CONTROLES */}
      <section className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="mt-10 flex flex-col gap-3 border-y-2 border-[#F1EDE2]/12 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C9C2B6]">Período</span>
            <div className="flex gap-1.5">
              {RANGES.map((r) => {
                const active = range === r.key
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={cn(
                      "border-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                      active
                        ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                        : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                    )}
                    style={active ? { background: GREEN } : undefined}
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Select subperfil */}
          <div className="relative">
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              disabled={perfilLoading}
              className="h-11 w-full appearance-none border-2 border-[#F1EDE2]/25 bg-transparent px-4 pr-10 text-sm font-bold uppercase tracking-wide text-[#F1EDE2] outline-none transition focus:border-[#16B79A] sm:min-w-[240px]"
            >
              <option value="" className="bg-[#1D1810]">Todos os subperfis</option>
              {subprofiles.map((p) => (
                <option key={p.id_profile} value={p.id_profile} className="bg-[#1D1810]">
                  {p.display_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F1EDE2]" />
          </div>
        </div>
        {profileId && (
          <p className="mt-2 text-[11px] text-[#C9C2B6]/70">
            Curso e Afiliado são por conta — não filtram por subperfil.
          </p>
        )}
      </section>

      {/* GRID principal */}
      <section className="mx-auto mt-8 grid w-full max-w-6xl gap-6 px-5 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Recebido" value={brl(totals.received)} accent />
            <Kpi label="Disponível" value={brl(totals.available)} />
            <Kpi label="Aguardando" value={brl(totals.pending)} />
            <Kpi label="Lançamentos" value={String(totals.count || 0)} />
          </div>

          {/* Gráfico */}
          <div className="mt-6 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
              <BarChart3 className="h-5 w-5" /> Ganhos por dia
            </h2>
            <EarningsBars series={series} loading={loading} />
          </div>

          {/* Extrato */}
          <div className="mt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="relative">
                <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-5xl">Extrato</h2>
                <Underline className="absolute -bottom-2 left-0 h-3.5 w-32" style={{ color: GREEN }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {KIND_FILTERS.map((f) => {
                  const active = kind === f.key
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setKind(f.key)}
                      className={cn(
                        "border-2 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] transition-transform hover:-translate-y-0.5",
                        active
                          ? "border-[#0B0B0D] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D]"
                          : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                      )}
                      style={active ? { background: GREEN } : undefined}
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {loading && items.length === 0 ? (
              <ExtratoSkeleton />
            ) : error ? (
              <StateBox
                icon={<AlertCircle className="h-6 w-6" />}
                title="Não deu pra carregar."
                desc={error}
                action={
                  <button
                    type="button"
                    onClick={() => load(1, true)}
                    className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                    style={{ background: GREEN }}
                  >
                    Tentar de novo
                  </button>
                }
              />
            ) : items.length === 0 ? (
              <StateBox
                icon={<Inbox className="h-6 w-6" />}
                title="Nenhum ganho ainda."
                desc="Quando você vender na Loja, fechar um agendamento, vender um curso ou receber comissão de afiliado, aparece aqui."
              />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {items.map((it) => (
                    <ExtratoRow key={`${it.kind}-${it.id}`} it={it} />
                  ))}
                </div>
                {page < totalPages && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const next = page + 1
                        setPage(next)
                        void load(next, false)
                      }}
                      className="inline-flex items-center gap-2 border-2 border-[#F1EDE2]/25 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Carregar mais
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <MarketSidebar />
      </section>
    </main>
  )
}

/* ── KPI ──────────────────────────────────────────────────────────────────── */
function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className="border-2 border-[#0B0B0D] p-3.5 shadow-[5px_5px_0_0_#0B0B0D]"
      style={{ background: accent ? GREEN : PAPER }}
    >
      <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.14em]", accent ? "text-[#06251F]" : "text-[#6B6457]")}>
        {label}
      </p>
      <p
        className="mt-1 fl-display text-2xl leading-none sm:text-[1.7rem]"
        style={{ color: accent ? INK : GREEN_DEEP }}
      >
        {value}
      </p>
    </div>
  )
}

/* ── Gráfico de barras ────────────────────────────────────────────────────── */
function EarningsBars({ series, loading }: { series: SeriesPoint[]; loading: boolean }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(false)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [series])

  if (loading && series.length === 0) {
    return <div className="h-40 animate-pulse border-2 border-dashed border-[#0B0B0D]/20" />
  }
  const max = Math.max(1, ...series.map((p) => p.net_cents))
  const hasData = series.some((p) => p.net_cents > 0)
  const step = series.length > 31 ? 13 : series.length > 10 ? 5 : 2

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px] sm:gap-1">
        {series.map((p, i) => {
          const h = hasData ? Math.max(2, Math.round((p.net_cents / max) * 100)) : 2
          return (
            <div key={p.day} className="flex flex-1 items-end justify-center">
              <div
                title={`${shortDay(p.day)} · ${brl(p.net_cents)}`}
                className="w-full origin-bottom border border-[#0B0B0D] transition-transform duration-500 ease-out"
                style={{
                  height: `${h}%`,
                  background: p.net_cents > 0 ? GREEN : "#0B0B0D14",
                  transform: mounted ? "scaleY(1)" : "scaleY(0)",
                  transitionDelay: `${Math.min(i * 12, 360)}ms`,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-bold uppercase tracking-wide text-[#6B6457]">
        {series.map((p, i) => (
          <span key={p.day} className="flex-1 text-center">
            {i % step === 0 ? shortDay(p.day) : ""}
          </span>
        ))}
      </div>
      {!hasData && <p className="mt-3 text-center text-xs font-semibold text-[#6B6457]">Sem movimento neste período.</p>}
    </div>
  )
}

/* ── Linha do extrato (card de papel reto, sombra dura) ───────────────────── */
function ExtratoRow({ it }: { it: Earning }) {
  const km = KIND_META[it.kind] || { label: it.kind, Icon: Wallet }
  const sm = STATUS_META[it.status] || { label: it.status, cls: "bg-[#0B0B0D] text-[#F1EDE2]" }
  const date = it.paid_at || it.available_at || it.created_at
  return (
    <div className="group flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 shadow-[5px_5px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[8px_8px_0_0_#16B79A] md:px-4">
      <span className="inline-flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center border-2 border-[#0B0B0D]" style={{ background: GREEN, outline: "2px solid #0B0B0D", outlineOffset: "1px" }}>
        <km.Icon className="h-5 w-5 text-[#06251F]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="fl-display truncate text-lg leading-none text-[#0B0B0D] md:text-xl">{it.title}</h4>
          <span className="-rotate-1 bg-[#0B0B0D] px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2]">
            {km.label}
          </span>
        </div>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">{fmtDate(date)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="fl-display text-xl leading-none md:text-2xl" style={{ color: GREEN_DEEP }}>{brl(it.net_cents)}</span>
        <span className={cn("px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em]", sm.cls)}>{sm.label}</span>
      </div>
    </div>
  )
}

/* ── Estados ──────────────────────────────────────────────────────────────── */
function StateBox({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center border-2 border-dashed border-[#F1EDE2]/15 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center text-[#06251F]" style={{ background: GREEN }}>{icon}</span>
      <p className="mt-4 fl-display text-2xl text-[#F1EDE2]">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-[#C9C2B6]/70">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
function ExtratoSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[72px] animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
      ))}
    </div>
  )
}

/* ═══ Sidebar de mercado ══════════════════════════════════════════════════════ */
function MarketSidebar() {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<{ stocks: MarketItem[]; quotes: MarketItem[]; news: NewsItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    clientFetchWithTimeout("/api/market/snapshot", {}, 9000)
      .then((r) => r.json())
      .then((d) => setData({ stocks: d.stocks || [], quotes: d.quotes || [], news: d.news || [] }))
      .catch(() => setErr(true))
      .finally(() => setLoading(false))
  }, [])

  const body = (
    <div className="space-y-5">
      <MarketSection title="Ações em alta" icon={<TrendingUp className="h-4 w-4" />}>
        {loading ? <RowsSkeleton n={4} /> : err || !data?.stocks.length ? (
          <Muted>Sem dados de ações no momento.</Muted>
        ) : (
          data.stocks.map((s) => <QuoteRow key={s.symbol} item={s} />)
        )}
      </MarketSection>
      <MarketSection title="Cotações" icon={<LineChart className="h-4 w-4" />}>
        {loading ? <RowsSkeleton n={4} /> : err || !data?.quotes.length ? (
          <Muted>Cotações indisponíveis no momento.</Muted>
        ) : (
          data.quotes.map((q) => <QuoteRow key={q.symbol} item={q} />)
        )}
      </MarketSection>
      <MarketSection title="Mercado & política" icon={<Newspaper className="h-4 w-4" />}>
        {loading ? <RowsSkeleton n={2} /> : data?.news?.length ? (
          data.news.map((n) => <NewsRow key={n.id} item={n} />)
        ) : (
          <Muted>Sem manchetes por enquanto.</Muted>
        )}
      </MarketSection>
    </div>
  )

  const Card = (
    <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
      <h2 className="mb-4 flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
        <span className="inline-flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D]" style={{ background: GREEN }}>
          <BarChart3 className="h-3.5 w-3.5 text-[#06251F]" />
        </span>
        Mercado
      </h2>
      {body}
    </div>
  )

  return (
    <>
      <aside className="hidden lg:block">
        <div className="sticky top-6">{Card}</div>
      </aside>

      {/* Mobile: botão + slide-over */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#06251F] shadow-[4px_4px_0_0_#0B0B0D] lg:hidden"
        style={{ background: GREEN }}
      >
        <BarChart3 className="h-4 w-4" /> Mercado
      </button>
      <div className={cn("fixed inset-0 z-40 lg:hidden", !open && "pointer-events-none")} aria-hidden={!open}>
        <div
          onClick={() => setOpen(false)}
          className={cn("absolute inset-0 bg-[#0B0B0D]/60 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        />
        <div
          className="absolute right-0 top-0 h-full w-[90%] max-w-[360px] overflow-y-auto border-l-2 border-[#0B0B0D] bg-[#15120E] p-4 transition-transform duration-300 ease-out"
          style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="fl-display text-2xl text-[#F1EDE2]">Mercado</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="inline-flex h-9 w-9 items-center justify-center border-2 border-[#F1EDE2]/25 text-[#F1EDE2]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {Card}
        </div>
      </div>
    </>
  )
}

function MarketSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B6457]">
        {icon} {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function QuoteRow({ item }: { item: MarketItem }) {
  const up = (item.change_pct ?? 0) >= 0
  const isPts = item.currency === "pts"
  const small = item.price != null && item.price < 1
  const price = item.price == null
    ? "—"
    : isPts
      ? item.price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
      : item.price.toLocaleString("pt-BR", {
          style: "currency", currency: "BRL",
          minimumFractionDigits: small ? 4 : 2, maximumFractionDigits: small ? 4 : 2,
        })
  return (
    <div className="flex items-center justify-between gap-2 border border-[#0B0B0D]/20 bg-white/60 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        {item.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.logo_url} alt="" className="h-5 w-5 shrink-0 object-contain" />
        ) : (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center border border-[#0B0B0D]/40 text-[9px] font-black text-[#0B0B0D]">
            {item.symbol.replace(/[^A-Z]/g, "").slice(0, 2) || "$"}
          </span>
        )}
        <span className="truncate text-xs font-extrabold uppercase tracking-wide text-[#0B0B0D]">{item.label}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-xs font-black tabular-nums text-[#0B0B0D]">{price}</span>
        <span className={cn("flex items-center gap-0.5 text-[10px] font-bold tabular-nums", up ? "text-[#00876B]" : "text-[#9A3412]")}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {pct(item.change_pct)}
        </span>
      </div>
    </div>
  )
}
function NewsRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 border border-[#0B0B0D]/20 bg-white/60 p-2 transition hover:border-[#0B0B0D]"
    >
      <span className="h-12 w-16 shrink-0 overflow-hidden border border-[#0B0B0D]/30 bg-[#0B0B0D]/[0.06]">
        {item.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-[#0B0B0D]">{item.title}</p>
        {item.source && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">{item.source}</p>}
      </div>
    </a>
  )
}
function RowsSkeleton({ n }: { n: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse border border-[#0B0B0D]/15 bg-[#0B0B0D]/[0.05]" />
      ))}
    </div>
  )
}
function Muted({ children }: { children: ReactNode }) {
  return <p className="px-1 py-2 text-xs font-semibold text-[#6B6457]">{children}</p>
}
