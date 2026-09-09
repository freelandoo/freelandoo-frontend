"use client"

// /wallet/carteira — O DINHEIRO DA PESSOA.
//
// Aqui mora o que é da conta: a Vida Financeira (o que ela lança todo dia), o
// escopo (perfil e período), os KPIs, o termômetro do MEI, o gráfico e o
// EXTRATO dos ganhos da plataforma.
//
// ⚠️ ISTO ERA A RAIZ `/wallet` ATÉ 2026-09-08, e virou a página do pill VERDE
// quando o Alex pediu que a raiz fosse o FINANCEIRO — a plataforma financeira
// da Freelandoo inteira, onde todo mundo publica. A troca não foi de estilo: as
// duas telas respondem perguntas diferentes ("quanto EU tenho" × "o que o mundo
// está falando de dinheiro"), e quem chega pela foto de perfil quer a primeira.
//
// Os quatro botões retráteis do headcard NAVEGAM, cada um com página própria:
// esta (Carteira), /wallet/vaquinha, /wallet/cupom e /wallet/mercado. Antes
// eles abriam painéis de uma página só, e três assuntos dividiam a mesma
// rolagem sem endereço nenhum. O headcard é peça compartilhada
// (`_components/wallet-headcard.tsx`) porque aparece nas CINCO telas.
//
// O extrato ficou AQUI, e não na página do cupom onde vivia: ele sai do mesmo
// `/me/earnings` que alimenta os KPIs e o gráfico, e obedece ao mesmo seletor
// de perfil e de período. Do outro lado, as duas telas buscariam o mesmo
// endpoint e o recorte mudaria de lugar conforme a página. O recorte "Cupom",
// que era o único filtro de outra fonte, foi inteiro para /wallet/cupom.
//
// IDENTIDADE TABLOIDE (igual ranking/Casa Views/Mensagens): canvas warm escuro
// + textura, manchete condensada fl-display, eyebrow manuscrito fl-marker,
// cards de papel com cantos RETOS e sombra dura preta (hover vira sombra verde).
// Acento = teal-verde (no lugar do dourado do ranking).
//
// Custo Vercel: nada aqui faz polling.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle, BarChart3, ChevronDown, Inbox, Loader2, PiggyBank,
} from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { Halftone, Underline } from "@/components/home/landing/primitives"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { VidaFinanceira } from "../_components/vida-financeira"
import { MeiCard } from "../_components/mei-card"
import { WalletHeadcard, useVaquinhaEnabled } from "../_components/wallet-headcard"
import {
  ExtratoRow, ExtratoSkeleton, GREEN, Kpi, StateBox, brl, shortDay,
  type Agg, type Earning, type SeriesPoint,
} from "../_components/wallet-ui"

const RANGES = [
  { key: "7d", label: "7 dias", labelKey: "range7d" },
  { key: "30d", label: "30 dias", labelKey: "range30d" },
  { key: "90d", label: "90 dias", labelKey: "range90d" },
]
/**
 * O recorte "Cupom" SAIU daqui: ele não era um `kind` de ganho, era a lista de
 * VENDAS feitas com o cupom do usuário, que vem de outro endpoint — e agora tem
 * a página dela (/wallet/cupom). Deixá-lo no trilho faria o mesmo assunto viver
 * em dois lugares.
 */
const KIND_FILTERS = [
  { key: "all", label: "Todos", labelKey: "filterAll" },
  { key: "product", label: "Loja", labelKey: "kindStore" },
  { key: "service", label: "Serviço", labelKey: "kindService" },
  { key: "course", label: "Curso", labelKey: "kindCourse" },
  { key: "affiliate", label: "Afiliado", labelKey: "kindAffiliate" },
]

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function WalletMoneyPage() {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
  const { perfil, isLoading: perfilLoading } = useMeProfile()
  // A Vaquinha SAIU da pilha do headcard em 2026-09-08 e virou um botão aqui
  // (pedido do Alex). O gate é o mesmo de sempre — flag do admin E preferência
  // da pessoa —, lido do arquivo do headcard para não virar uma segunda
  // resposta à mesma pergunta.
  const vaquinhaOn = useVaquinhaEnabled()

  // Comunidade (pet/carro/games/bairro/condomínio) mora na MESMA tabela dos
  // perfis, então filtrar só `is_clan` fazia "Meu pet" e "Meu carro" aparecerem
  // aqui como se fossem perfis. Não existe hierarquia: a lista é a dos perfis
  // do dono — o primeiro e os abertos depois, todos no mesmo grau.
  const ownProfiles = useMemo(
    () => (perfil?.profiles || []).filter((p) => !p.is_clan && !p.is_community),
    [perfil]
  )

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
  /** Entradas manuais da Vida Financeira, somadas desde sempre. */
  const [manualInCents, setManualInCents] = useState(0)

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
        if (!eRes.ok) throw new Error(tr("loadStatementError", "Falha ao carregar extrato"))
        const eData = await eRes.json()
        setAgg(eData.aggregates || null)
        setTotalPages(eData.pagination?.total_pages || 1)
        setItems((prev) => (replace ? eData.items || [] : [...prev, ...(eData.items || [])]))
        if (sRes && sRes.ok) setSeries((await sRes.json()).series || [])
      } catch (e) {
        setError(e instanceof Error ? e.message : tr("loadError", "Erro ao carregar"))
      } finally {
        setLoading(false)
      }
    },
    [profileId, range, kind, tr]
  )

  useEffect(() => {
    setPage(1)
    void load(1, true)
  }, [load])

  /**
   * A metade "sua" do Total recebido. Fica FORA do `load` de propósito: não
   * depende de perfil nem de período, então trocar o filtro do extrato não
   * precisa buscá-la de novo. Só o que a Vida Financeira muda a invalida.
   */
  const loadManualIn = useCallback(async () => {
    const t = token()
    if (!t) return
    try {
      const r = await clientFetchWithTimeout(
        "/api/me/wallet/finance/received-in",
        { headers: { Authorization: `Bearer ${t}` } },
        9000
      )
      if (r.ok) setManualInCents(Number((await r.json())?.received_in_cents) || 0)
    } catch {
      /* silencioso: o KPI cai para só o lado da plataforma */
    }
  }, [])

  useEffect(() => {
    void loadManualIn()
  }, [loadManualIn])

  const totals = agg?.totals || {}

  return (
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      <WalletHeadcard
        perfil={perfil}
        eyebrow={tr("heroEyebrow", "a sua grana")}
        title={tr("heroTitle", "Carteira")}
        backHref="/wallet"
        active="wallet"
      />

      {/* VIDA FINANCEIRA — grudada no headcard (só a folga da sombra dura).
          É o que a pessoa vem fazer aqui todo dia: lançar o que entrou e o que
          saiu. Estava no fim da página, depois de KPIs, MEI e gráfico, e por
          isso só aparecia depois de duas telas de rolagem. */}
      <section className="mx-auto mt-3 w-full max-w-6xl px-3 md:px-8">
        <VidaFinanceira
          onEntriesChanged={loadManualIn}
          action={
            vaquinhaOn ? (
              /* ROSA e com a cara do pill, porque é a mesma porta que estava na
                 pilha até hoje — mudar de forma ao mudar de lugar faria procurar
                 duas vezes. Aqui ele NAVEGA no primeiro clique: o pill precisava
                 de dois porque nascia escondido atrás da foto, e este não
                 esconde nada.
                 `/vaquinha/nova` é create-or-open: quem já tem cai na dela. */
              <Link
                href="/vaquinha/nova"
                aria-label={tr("vaquinhaPillAria", "Abrir minha vaquinha")}
                className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#DB2777] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:bg-[#BE185D]"
              >
                <PiggyBank className="h-4 w-4" />
                {tr("vaquinhaPill", "Vaquinha")}
              </Link>
            ) : null
          }
        />
      </section>

      {/* GANHOS NA PLATAFORMA — escopo, KPIs, MEI, gráfico e extrato. Vem
          depois porque é retrato (o que a plataforma já te pagou), não
          lançamento. */}
      <section className="mx-auto mt-8 w-full max-w-6xl px-3 md:px-8">
        <div className="min-w-0">
          {/* CONTROLES DE ESCOPO — valem para os KPIs, o gráfico e o extrato. */}
          <div className="flex flex-col gap-3 border-y-2 border-[#F1EDE2]/12 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#C9C2B6]">{tr("period", "Período")}</span>
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
                      {tr(r.labelKey, r.label)}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Select de perfil */}
            <div className="relative">
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                disabled={perfilLoading}
                className="h-11 w-full appearance-none border-2 border-[#F1EDE2]/25 bg-transparent px-4 pr-10 text-sm font-bold uppercase tracking-wide text-[#F1EDE2] outline-none transition focus:border-[#16B79A] sm:min-w-[240px]"
              >
                <option value="" className="bg-[#1D1810]">{tr("allProfiles", "Todos os perfis")}</option>
                {ownProfiles.map((p) => (
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
              {tr("courseAffiliateNote", "Curso e Afiliado são por conta — não filtram por perfil.")}{" "}
              {tr("manualInAccountNote", "Suas entradas da Vida Financeira também são da conta e seguem no Total recebido.")}
            </p>
          )}

          {/* KPIs */}
          {/* "Revertido" veio do Meus Faturamentos: sem ele, reembolso e
              cancelamento sumiam da conta e o extrato não fechava. */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Kpi label={tr("kpiReceived", "Recebido")} value={brl(totals.received, locale)} accent />
            <Kpi label={tr("kpiAvailable", "Disponível")} value={brl(totals.available, locale)} />
            <Kpi label={tr("kpiPending", "Aguardando")} value={brl(totals.pending, locale)} />
            <Kpi label={tr("kpiReversed", "Revertido")} value={brl(totals.reversed, locale)} />
            <Kpi label={tr("kpiEntries", "Lançamentos")} value={String(totals.count || 0)} />
            {/* TOTAL RECEBIDO = o que a plataforma pagou + o que a pessoa
                lançou como entrada na Vida Financeira.
                A conta é honesta porque as DUAS metades são vitalícias: os
                KPIs vizinhos não filtram por data (o seletor de período move só
                o gráfico) e a soma manual conta tudo que já venceu.
                Ressalva que a legenda precisa dizer: a Vida Financeira é da
                CONTA — não existe lançamento manual por perfil —, então com um
                perfil selecionado só a metade da plataforma encolhe. */}
            <Kpi
              label={tr("kpiTotalReceived", "Total recebido")}
              value={brl((totals.received || 0) + manualInCents, locale)}
              hint={tr("kpiTotalReceivedHint", "plataforma + suas entradas")}
              emphasis
            />
          </div>

          {/* MEI — termômetro do teto + recibo */}
          <div className="mt-3">
            <MeiCard />
          </div>

          {/* Gráfico */}
          <div className="mt-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D] sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 fl-display text-2xl text-[#0B0B0D]">
              <BarChart3 className="h-5 w-5" /> {tr("earningsPerDay", "Ganhos por dia")}
            </h2>
            <EarningsBars series={series} loading={loading} />
          </div>

          {/* EXTRATO */}
          <div className="mt-10">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div className="relative">
                <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-5xl">{tr("statement", "Extrato")}</h2>
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
                      {tr(f.labelKey, f.label)}
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
                title={tr("loadFailedTitle", "Não deu pra carregar.")}
                desc={error}
                action={
                  <button
                    type="button"
                    onClick={() => load(1, true)}
                    className="border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] shadow-[3px_3px_0_0_#0B0B0D] transition hover:-translate-y-0.5"
                    style={{ background: GREEN }}
                  >
                    {tr("tryAgain", "Tentar de novo")}
                  </button>
                }
              />
            ) : items.length === 0 ? (
              <StateBox
                icon={<Inbox className="h-6 w-6" />}
                title={tr("emptyTitle", "Nenhum ganho ainda.")}
                desc={tr("emptyDesc", "Quando você vender na Loja, fechar um agendamento, vender um curso ou receber comissão de afiliado, aparece aqui.")}
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
                      {tr("loadMore", "Carregar mais")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

/* ── Gráfico de barras ────────────────────────────────────────────────────── */
function EarningsBars({ series, loading }: { series: SeriesPoint[]; loading: boolean }) {
  const tr = useTranslations("Wallet")
  const locale = useLocale()
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
                title={`${shortDay(p.day, locale)} · ${brl(p.net_cents, locale)}`}
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
            {i % step === 0 ? shortDay(p.day, locale) : ""}
          </span>
        ))}
      </div>
      {!hasData && (
        <p className="mt-3 text-center text-xs font-semibold text-[#6B6457]">
          {tr("noMovement", "Sem movimento neste período.")}
        </p>
      )}
    </div>
  )
}
