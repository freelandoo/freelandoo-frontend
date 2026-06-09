"use client"

// Carteira do user — extrato de ganhos (Loja/Serviço/Curso/Afiliado) escopável
// por subperfil + gráfico de barras (ganhos × dias) + sidebar de mercado
// (ações / cotações / notícias). Tema tabloide CLARO: papel off-white quente,
// contorno preto sólido, acento teal-verde (override de --fl-gold no escopo).
//
// Custo Vercel: o snapshot de mercado vem do cache do backend (atualizado por
// scheduler no Railway) via /api/market/snapshot com ISR — sem polling, sem
// fetch externo por request.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"
import {
  Wallet, ArrowLeft, ShoppingBag, Briefcase, GraduationCap, Percent,
  TrendingUp, TrendingDown, Newspaper, ChevronRight, ChevronLeft,
  Loader2, AlertCircle, Inbox, BarChart3, LineChart,
} from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"

/* ── tokens de tema (verde teal do anexo) ─────────────────────────────────── */
const GREEN = "#16B79A"
const GREEN_DEEP = "#00876B"
const themeStyle = {
  "--fl-gold": GREEN,
  "--fl-gold-deep": GREEN_DEEP,
} as CSSProperties

/* ── helpers ──────────────────────────────────────────────────────────────── */
function brl(cents?: number | null) {
  const v = (Number(cents) || 0) / 100
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function pct(n?: number | null) {
  const v = Number(n)
  if (!Number.isFinite(v)) return "—"
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
}
function shortDay(iso: string) {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
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
  pending: { label: "Aguardando", cls: "bg-[#0B0B0D]/[0.06] text-[#2b2b2e]" },
  reversed: { label: "Revertido", cls: "bg-[#C2410C]/10 text-[#9A3412]" },
}

/* ── tipos ────────────────────────────────────────────────────────────────── */
type Agg = {
  totals?: { received?: number; available?: number; pending?: number; reversed?: number; count?: number }
}
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
  { key: "7d", label: "7 dias", days: 7 },
  { key: "30d", label: "30 dias", days: 30 },
  { key: "90d", label: "90 dias", days: 90 },
]

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const { perfil, isLoading: perfilLoading } = useMeProfile()
  const subprofiles = useMemo(
    () => (perfil?.profiles || []).filter((p) => !p.is_clan),
    [perfil]
  )

  const [profileId, setProfileId] = useState<string>("") // "" = todos
  const [range, setRange] = useState("30d")

  const [agg, setAgg] = useState<Agg | null>(null)
  const [items, setItems] = useState<Earning[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [series, setSeries] = useState<SeriesPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null)

  // Extrato + agregados + série. Reseta página quando muda subperfil/range.
  const load = useCallback(
    async (pg: number, replace: boolean) => {
      const t = token()
      if (!t) return
      if (replace) setLoading(true)
      setError("")
      const pq = profileId ? `&profile=${encodeURIComponent(profileId)}` : ""
      try {
        const [eRes, sRes] = await Promise.all([
          clientFetchWithTimeout(
            `/api/me/earnings?page=${pg}&per_page=24${pq}`,
            { headers: { Authorization: `Bearer ${t}` } },
            9000
          ),
          replace
            ? clientFetchWithTimeout(
                `/api/me/earnings/series?range=${range}${pq}`,
                { headers: { Authorization: `Bearer ${t}` } },
                9000
              )
            : Promise.resolve(null),
        ])
        if (!eRes.ok) throw new Error("Falha ao carregar extrato")
        const eData = await eRes.json()
        setAgg(eData.aggregates || null)
        setTotalPages(eData.pagination?.total_pages || 1)
        setItems((prev) => (replace ? eData.items || [] : [...prev, ...(eData.items || [])]))
        if (sRes && sRes.ok) {
          const sData = await sRes.json()
          setSeries(sData.series || [])
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar")
      } finally {
        setLoading(false)
      }
    },
    [profileId, range]
  )

  useEffect(() => {
    setPage(1)
    void load(1, true)
  }, [load])

  const totals = agg?.totals || {}

  return (
    <div className="fl-root" style={themeStyle}>
      <main className="fl-paper-card min-h-[100dvh] w-full">
        <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 md:py-10">
          {/* Cabeçalho */}
          <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Link
                href="/account"
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5b554b] transition hover:text-[#0B0B0D]"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </Link>
              <h1 className="fl-display flex items-center gap-2 text-4xl text-[#0B0B0D] sm:text-5xl">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#0B0B0D] sm:h-12 sm:w-12"
                  style={{ background: GREEN, boxShadow: "3px 3px 0 0 #0B0B0D" }}
                >
                  <Wallet className="h-5 w-5 text-[#06251F] sm:h-6 sm:w-6" />
                </span>
                Carteira
              </h1>
              {perfil?.username && (
                <p className="mt-1 text-sm font-medium text-[#5b554b]">@{perfil.username}</p>
              )}
            </div>

            {/* Select de subperfil */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
                Subperfil
              </label>
              <div className="relative">
                <select
                  value={profileId}
                  onChange={(e) => setProfileId(e.target.value)}
                  disabled={perfilLoading}
                  className="w-full appearance-none rounded-xl border-2 border-[#0B0B0D] bg-white px-4 py-2.5 pr-9 text-sm font-bold text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] outline-none transition focus:shadow-[3px_3px_0_0_var(--fl-gold)] md:min-w-[220px]"
                >
                  <option value="">Todos os subperfis</option>
                  {subprofiles.map((p) => (
                    <option key={p.id_profile} value={p.id_profile}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
                <ChevronRight className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[#0B0B0D]" />
              </div>
              {profileId && (
                <p className="text-[11px] text-[#5b554b]">
                  Curso e Afiliado são por conta — não filtram por subperfil.
                </p>
              )}
            </div>
          </header>

          {/* Grid principal: conteúdo + sidebar de mercado */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Kpi label="Recebido" value={brl(totals.received)} accent />
                <Kpi label="Disponível" value={brl(totals.available)} />
                <Kpi label="Aguardando" value={brl(totals.pending)} muted />
                <Kpi label="Lançamentos" value={String(totals.count || 0)} muted />
              </div>

              {/* Gráfico de barras */}
              <div className="fl-card mt-6 rounded-2xl p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#0B0B0D]">
                    <BarChart3 className="h-4 w-4" /> Ganhos por dia
                  </h2>
                  <div className="flex gap-1">
                    {RANGES.map((r) => (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRange(r.key)}
                        className={`rounded-full border-2 border-[#0B0B0D] px-2.5 py-1 text-[11px] font-bold transition ${
                          range === r.key
                            ? "bg-[#0B0B0D] text-white"
                            : "bg-transparent text-[#0B0B0D] hover:bg-[#0B0B0D]/[0.05]"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <EarningsBars series={series} loading={loading} />
              </div>

              {/* Extrato */}
              <div className="mt-6">
                <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-[#0B0B0D]">
                  Extrato
                </h2>
                {loading && items.length === 0 ? (
                  <ExtratoSkeleton />
                ) : error ? (
                  <StateBox
                    icon={<AlertCircle className="h-6 w-6" />}
                    title="Não foi possível carregar"
                    desc={error}
                    action={
                      <button
                        type="button"
                        onClick={() => load(1, true)}
                        className="fl-btn-gold rounded-full px-4 py-2 text-xs font-bold"
                      >
                        Tentar de novo
                      </button>
                    }
                  />
                ) : items.length === 0 ? (
                  <StateBox
                    icon={<Inbox className="h-6 w-6" />}
                    title="Nenhum ganho ainda"
                    desc="Quando você vender na Loja, fechar um agendamento, vender um curso ou receber comissão de afiliado, aparece aqui."
                  />
                ) : (
                  <>
                    <ul className="space-y-2.5">
                      {items.map((it) => (
                        <ExtratoRow key={`${it.kind}-${it.id}`} it={it} />
                      ))}
                    </ul>
                    {page < totalPages && (
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            const next = page + 1
                            setPage(next)
                            void load(next, false)
                          }}
                          className="inline-flex items-center gap-2 rounded-full border-2 border-[#0B0B0D] bg-white px-5 py-2 text-xs font-bold text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:bg-[#0B0B0D] hover:text-white active:translate-x-px active:translate-y-px"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Carregar mais
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            {/* Sidebar de mercado */}
            <MarketSidebar />
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── KPI card ─────────────────────────────────────────────────────────────── */
function Kpi({ label, value, accent, muted }: { label: string; value: string; accent?: boolean; muted?: boolean }) {
  return (
    <div
      className="rounded-2xl border-2 border-[#0B0B0D] p-3.5"
      style={{
        background: accent ? GREEN : "white",
        boxShadow: "4px 4px 0 0 #0B0B0D",
      }}
    >
      <p className={`text-[11px] font-bold uppercase tracking-wider ${accent ? "text-[#06251F]" : "text-[#5b554b]"}`}>
        {label}
      </p>
      <p className={`mt-1 text-lg font-black tabular-nums sm:text-xl ${accent ? "text-[#06251F]" : muted ? "text-[#2b2b2e]" : "text-[#0B0B0D]"}`}>
        {value}
      </p>
    </div>
  )
}

/* ── Gráfico de barras (ganhos × dias) ────────────────────────────────────── */
function EarningsBars({ series, loading }: { series: SeriesPoint[]; loading: boolean }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(false)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [series])

  if (loading && series.length === 0) {
    return <div className="h-40 animate-pulse rounded-xl bg-[#0B0B0D]/[0.05]" />
  }
  const max = Math.max(1, ...series.map((p) => p.net_cents))
  const hasData = series.some((p) => p.net_cents > 0)
  // Em ranges longos, rotular só alguns dias pra não poluir.
  const step = series.length > 31 ? 13 : series.length > 10 ? 5 : 2

  return (
    <div>
      <div className="flex h-40 items-end gap-[3px] sm:gap-1">
        {series.map((p, i) => {
          const h = hasData ? Math.max(2, Math.round((p.net_cents / max) * 100)) : 2
          return (
            <div key={p.day} className="group relative flex flex-1 items-end justify-center">
              <div
                title={`${shortDay(p.day)} · ${brl(p.net_cents)}`}
                className="w-full origin-bottom rounded-t-[3px] border border-[#0B0B0D] transition-transform duration-500 ease-out"
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
      <div className="mt-2 flex justify-between text-[10px] font-medium text-[#5b554b]">
        {series.map((p, i) => (
          <span key={p.day} className="flex-1 text-center">
            {i % step === 0 ? shortDay(p.day) : ""}
          </span>
        ))}
      </div>
      {!hasData && (
        <p className="mt-3 text-center text-xs text-[#5b554b]">
          Sem movimento neste período.
        </p>
      )}
    </div>
  )
}

/* ── Linha do extrato ─────────────────────────────────────────────────────── */
function ExtratoRow({ it }: { it: Earning }) {
  const km = KIND_META[it.kind] || { label: it.kind, Icon: Wallet }
  const sm = STATUS_META[it.status] || { label: it.status, cls: "bg-[#0B0B0D]/[0.06] text-[#2b2b2e]" }
  const date = it.paid_at || it.available_at || it.created_at
  return (
    <li className="flex items-center gap-3 rounded-xl border-2 border-[#0B0B0D] bg-white px-3.5 py-3 shadow-[3px_3px_0_0_#0B0B0D]">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[#0B0B0D]" style={{ background: `${GREEN}22` }}>
        <km.Icon className="h-4 w-4 text-[#06251F]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#0B0B0D]">{it.title}</p>
        <p className="text-[11px] text-[#5b554b]">
          {km.label} · {fmtDate(date)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-sm font-black tabular-nums text-[#0B0B0D]">{brl(it.net_cents)}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sm.cls}`}>{sm.label}</span>
      </div>
    </li>
  )
}

/* ── Estados (empty / error) ──────────────────────────────────────────────── */
function StateBox({ icon, title, desc, action }: { icon: ReactNode; title: string; desc: string; action?: ReactNode }) {
  return (
    <div className="fl-card flex flex-col items-center rounded-2xl px-6 py-10 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#0B0B0D] text-[#0B0B0D]" style={{ background: `${GREEN}22` }}>
        {icon}
      </span>
      <p className="text-base font-extrabold text-[#0B0B0D]">{title}</p>
      <p className="mt-1 max-w-md text-sm text-[#5b554b]">{desc}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
function ExtratoSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[60px] animate-pulse rounded-xl border-2 border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.04]" />
      ))}
    </div>
  )
}

/* ═══ Sidebar de mercado (ações / cotações / notícias) ════════════════════════ */
function MarketSidebar() {
  const [open, setOpen] = useState(false) // mobile slide-over
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

  return (
    <>
      {/* Desktop: coluna fixa */}
      <aside className="hidden lg:block">
        <div className="sticky top-6">
          <div className="fl-card rounded-2xl p-4">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#0B0B0D]">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border-2 border-[#0B0B0D]" style={{ background: GREEN }}>
                <BarChart3 className="h-3.5 w-3.5 text-[#06251F]" />
              </span>
              Mercado
            </h2>
            {body}
          </div>
        </div>
      </aside>

      {/* Mobile: botão + slide-over */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full border-2 border-[#0B0B0D] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-[#06251F] shadow-[3px_3px_0_0_#0B0B0D] lg:hidden"
        style={{ background: GREEN }}
      >
        <BarChart3 className="h-4 w-4" /> Mercado
      </button>
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-[#0B0B0D]/40 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          className="fl-paper-card absolute right-0 top-0 h-full w-[88%] max-w-[360px] overflow-y-auto border-l-2 border-[#0B0B0D] p-4 transition-transform duration-300 ease-out"
          style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[#0B0B0D]">
              <BarChart3 className="h-4 w-4" /> Mercado
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-white text-[#0B0B0D]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          {body}
        </div>
      </div>
    </>
  )
}

function MarketSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#5b554b]">
        {icon} {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}
function QuoteRow({ item }: { item: MarketItem }) {
  const up = (item.change_pct ?? 0) >= 0
  const isPts = item.currency === "pts"
  const small = item.price != null && item.price < 1 // ex.: Rublo (~R$ 0,07)
  const price = item.price == null
    ? "—"
    : isPts
      ? item.price.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
      : item.price.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: small ? 4 : 2,
          maximumFractionDigits: small ? 4 : 2,
        })
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[#0B0B0D]/15 bg-white/70 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        {item.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.logo_url} alt="" className="h-5 w-5 shrink-0 rounded-full object-contain" />
        ) : (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#0B0B0D]/30 text-[9px] font-black text-[#0B0B0D]">
            {item.symbol.replace(/[^A-Z]/g, "").slice(0, 2) || "$"}
          </span>
        )}
        <span className="truncate text-xs font-bold text-[#0B0B0D]">{item.label}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-xs font-bold tabular-nums text-[#0B0B0D]">{price}</span>
        <span className={`flex items-center gap-0.5 text-[10px] font-bold tabular-nums ${up ? "text-[#00876B]" : "text-[#C2410C]"}`}>
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
      className="flex items-center gap-2.5 rounded-lg border border-[#0B0B0D]/15 bg-white/70 p-2 transition hover:border-[#0B0B0D]"
    >
      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-[#0B0B0D]/20 bg-[#0B0B0D]/[0.05]">
        {item.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-[#0B0B0D]">{item.title}</p>
        {item.source && <p className="mt-0.5 text-[10px] text-[#5b554b]">{item.source}</p>}
      </div>
    </a>
  )
}
function RowsSkeleton({ n }: { n: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-9 animate-pulse rounded-lg bg-[#0B0B0D]/[0.05]" />
      ))}
    </div>
  )
}
function Muted({ children }: { children: ReactNode }) {
  return <p className="px-1 py-2 text-xs text-[#5b554b]">{children}</p>
}
