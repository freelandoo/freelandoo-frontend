"use client"

/**
 * OS INDICADORES DO NEGÓCIO — a tela do pill "Indicadores".
 *
 * Reformulada em 2026-09-25 (pedido do Alex): "está muito transparente, precisa
 * ficar mais sólido e ter mais contraste" + quem entra no site, conversões,
 * agendamentos, melhores horários, membros, membros ativos, e os custos
 * lançados no Financeiro virando receita × custo × lucro.
 *
 * ─── A ORDEM É A DAS PERGUNTAS DO DONO ──────────────────────────────────────
 *
 * 1. "Estou ganhando dinheiro?" → o RESULTADO (lucro, receita, custos, margem).
 * 2. "Está melhorando?" → quatro números com a seta do período anterior.
 * 3. "O site vende?" → o FUNIL, degrau por degrau.
 * 4. "Quando a cadeira enche?" → a AGENDA da equipe e o mapa de horários.
 * 5. "A comunidade está viva?" → membros, novos, ativos, quem publica.
 * 6. Os leads e a série por dia, que são o detalhe.
 *
 * ─── ⚠️ SÓLIDO DE PROPÓSITO — não usar `bg-[#15120E]` aqui ─────────────────
 *
 * A pele `.fl-business` reescreve `bg-[#15120E]` como painel TRANSLÚCIDO (0.78)
 * por cima do fundo animado — é isso que deixava a tela "transparente". Aqui
 * os painéis leem as MESMAS variáveis da pele (a cor que o líder escolheu), mas
 * OPACAS, com borda clara e tinta forte: número de dinheiro não pode brigar
 * com o fundo. Os fallbacks dentro do `var()` são o marrom tabloide, para o
 * caso de a pele não estar montada.
 *
 * ─── ⚠️ A TELA DIZ DE ONDE CADA NÚMERO VEM ──────────────────────────────────
 *
 * Leads são da CONTA (WhatsApp e caixa de O.S. da pessoa), a agenda é da
 * EQUIPE (a agenda é da conta de cada profissional) e os custos só entram
 * quando o lançamento da Vida Financeira foi marcado como deste negócio (mig
 * 261) — a Vida Financeira é pessoal, e somá-la inteira daria lucro falso.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  Clock,
  Eye,
  Filter,
  Loader2,
  Minus,
  MessageCircle,
  Plus,
  ShieldAlert,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { PageBackLink, TabloidDialog } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getToken, getStoredUser } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { CommunityShellBeacon } from "@/components/layout/community-shell"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
import { TechBackdrop } from "@/components/platform/tech-backdrop"
import {
  accentHex,
  backdropTint,
  canBuildCommunitySite,
  platformSkinVars,
} from "../../_components/community-ui"

type Community = {
  id_profile: string
  display_name: string
  kind?: string | null
  id_leader_user?: string | null
  has_site?: boolean
  community_theme: { accent?: string; background?: string } | null
}

type Point = {
  day: string
  views: number
  booking_clicks: number
  whatsapp_clicks: number
  whatsapp_people: number
  whatsapp_messages: number
  os_people: number
  os_messages: number
  bookings: number
  site_bookings: number
  team_bookings: number
  new_members: number
  platform_revenue_cents: number
  manual_in_cents: number
  revenue_cents: number
  cost_cents: number
  profit_cents: number
}

type Slot = { dow: number; hour: number; bookings: number }

type Indicators = {
  range: { days: number; since: string; until: string; windows: number[] }
  finance: {
    revenue_cents: number
    platform_revenue_cents: number
    manual_in_cents: number
    cost_cents: number
    profit_cents: number
    margin_pct: number | null
    prev: { revenue_cents: number; cost_cents: number; profit_cents: number }
    fixed_monthly_cost_cents: number
    top_costs: { label: string; cents: number }[]
    has_entries: boolean
  }
  site: {
    views: number
    booking_clicks: number
    whatsapp_clicks: number
    bookings: number
    paid: number
    prev: { views: number; booking_clicks: number; bookings: number }
  }
  bookings: {
    team: {
      people: number
      valid: number
      canceled: number
      no_show: number
      prev_valid: number
    }
    heat: Slot[]
    top_slots: Slot[]
    best_weekday: { dow: number; bookings: number } | null
    best_hour: { hour: number; bookings: number } | null
  }
  members: {
    total: number
    new: number
    new_prev: number
    active: number
    participants: number
  }
  leads: {
    people: number
    messages: number
    whatsapp: { connected: boolean; status: string | null; people: number; messages: number }
    os: { people: number; messages: number }
  }
  series: Point[]
}

// ── a paleta SÓLIDA (ver o cabeçalho) ─────────────────────────────────────
const PANEL =
  "border-2 border-[rgba(var(--fl-skin-edge-rgb,245,241,232),0.4)] bg-[rgb(var(--fl-skin-panel-rgb,21,18,14))]"
const TILE =
  "border-2 border-[rgba(var(--fl-skin-edge-rgb,245,241,232),0.28)] bg-[rgb(var(--fl-skin-inner-rgb,29,24,16))]"
const INK = "text-[rgb(var(--fl-skin-ink-rgb,245,241,232))]"
const SUB = "text-[rgba(var(--fl-skin-ink-rgb,245,241,232),0.72)]"
const LABEL = cn("text-[10px] font-extrabold uppercase tracking-[0.14em]", SUB)
const GOOD = "#22C55E"
const BAD = "#F43F5E"
const BTN =
  "inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em]"

type Metric = "views" | "leads" | "bookings" | "revenue" | "members"

export function CommunityIndicators({ communityId }: { communityId: string }) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const [community, setCommunity] = useState<Community | null>(null)
  const [data, setData] = useState<Indicators | null>(null)
  const [days, setDays] = useState(30)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [metric, setMetric] = useState<Metric>("views")
  const [entryDir, setEntryDir] = useState<"in" | "out" | null>(null)

  const load = useCallback(async () => {
    try {
      const tk = getToken()
      const headers = tk ? { Authorization: `Bearer ${tk}` } : undefined

      const [cRes, iRes] = await Promise.all([
        fetch(`/api/communities/${communityId}`, headers ? { headers } : undefined),
        fetch(
          `/api/communities/${communityId}/indicators?days=${days}`,
          headers ? { headers } : undefined
        ),
      ])

      const cData = await cRes.json().catch(() => ({}))
      if (!cRes.ok) {
        setErrorMsg(cData?.error || t("notFound", "Comunidade não encontrada."))
        setState("error")
        return
      }
      setCommunity(cData.community)

      const iData = await iRes.json().catch(() => ({}))
      if (!iRes.ok) {
        // A recusa é DITA: esta tela é só do líder, e um painel zerado faria
        // parecer que o negócio não teve movimento nenhum.
        setErrorMsg(iData?.error || t("indLoadError", "Não deu para carregar os indicadores agora."))
        setState("error")
        return
      }
      setData(iData)
      setState("loaded")
    } catch {
      setErrorMsg(t("indLoadError", "Não deu para carregar os indicadores agora."))
      setState("error")
    }
  }, [communityId, days, t])

  useEffect(() => {
    void load()
  }, [load])

  const accent = accentHex(community?.community_theme?.accent, community?.kind)
  const isBusiness = (community?.kind ?? null) === "common"
  const shellKind: "business" | null = isBusiness ? "business" : null
  const bgKey = community?.community_theme?.background
  const skinVars = useMemo(
    () => (isBusiness ? platformSkinVars(bgKey) : undefined),
    [isBusiness, bgKey]
  )
  const bizTint = useMemo(() => backdropTint(bgKey), [bgKey])

  // A régua do Site é a MESMA da página e da de ranking, importada e não
  // copiada — o globo do dock tem que aparecer nas três ou em nenhuma.
  const siteEnabled = useFeature("comunidade_site")
  const viewerId = getStoredUser()?.id_user ?? null
  const isLeader = !!community?.id_leader_user && community.id_leader_user === viewerId
  const canBuildSite = canBuildCommunitySite({
    kind: community?.kind,
    isLeader,
    siteEnabled,
  })

  const money = useCallback(
    (cents: number) =>
      (Number(cents || 0) / 100).toLocaleString(locale, {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: Math.abs(cents) >= 100000 ? 0 : 2,
      }),
    [locale]
  )
  const pctText = useCallback((n: number) => `${n.toLocaleString(locale)}%`, [locale])

  /** Rótulo curto do eixo: só dia/mês, que é o que cabe embaixo de uma barra. */
  const dayLabel = useCallback((iso: string) => {
    const [, m, d] = iso.split("-")
    return `${d}/${m}`
  }, [])

  /** 1 = segunda … 7 = domingo (ISODOW). 2024-01-01 foi uma segunda. */
  const weekday = useCallback(
    (dow: number, style: "short" | "long" = "short") =>
      new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(
        new Date(Date.UTC(2024, 0, dow))
      ),
    [locale]
  )

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }

  if (state === "error" || !community || !data) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">
            {errorMsg || t("indLoadError", "Não deu para carregar os indicadores agora.")}
          </p>
          <div className="mt-4 flex justify-center">
            <PageBackLink href={`/comunidades/${communityId}`} />
          </div>
        </div>
      </div>
    )
  }

  const { finance, site, bookings, members, leads, series, range } = data
  const team = bookings.team
  const vsPrev = t("indVsPrev", "vs. {n} dias anteriores").replace("{n}", String(range.days))

  // Conversão = agendamentos que nasceram no site ÷ visitas. Sem visita não
  // existe taxa — "0%" diria que o site não converte, quando ninguém entrou.
  const conversion =
    site.views > 0 ? Math.round((site.bookings / site.views) * 1000) / 10 : null
  const prevConversion =
    site.prev.views > 0 ? Math.round((site.prev.bookings / site.prev.views) * 1000) / 10 : null
  const activeShare = members.total > 0 ? Math.round((members.active / members.total) * 100) : 0
  const cancelRate =
    team.valid + team.canceled > 0
      ? Math.round((team.canceled / (team.valid + team.canceled)) * 100)
      : null
  const profitPositive = finance.profit_cents >= 0

  return (
    <div
      style={skinVars}
      className={cn(
        "fl-root fl-sharp relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F1EDE2]",
        isBusiness && "fl-business"
      )}
    >
      {isBusiness && <TechBackdrop variant="business" tint={bizTint} />}
      {/* Esta tela também é o ambiente: sem o beacon o dock voltaria a ser o da
          Freelandoo no meio do negócio. */}
      {shellKind && (
        <CommunityShellBeacon
          communityId={communityId}
          kind={shellKind}
          canBuildSite={canBuildSite}
          canSeeIndicators={isLeader}
        />
      )}

      <div className="relative z-10 mx-auto w-full max-w-5xl px-0 pt-5 md:px-10">
        <div className="px-3">
          <PageBackLink href={`/comunidades/${communityId}`} />
        </div>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-3 px-3">
          <div>
            <p className={LABEL}>{community.display_name}</p>
            <h1 className={cn("fl-display text-4xl leading-[0.85] md:text-6xl", INK)}>
              {t("indTitle", "Indicadores")}
            </h1>
          </div>
          {/* A janela. Lista fechada — é o backend que decide quais existem. */}
          <div className="flex gap-2">
            {range.windows.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setDays(w)}
                aria-pressed={w === range.days}
                className={cn(
                  "border-2 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors",
                  w === range.days
                    ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]"
                    : cn(TILE, INK, "hover:border-[#F2B705]")
                )}
              >
                {t("indRangeDays", "{n} dias").replace("{n}", String(w))}
              </button>
            ))}
          </div>
        </header>

        <div className="mt-5 space-y-5">
          {/* ─── 1. O RESULTADO ─────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5 md:p-6")} style={{ boxShadow: `6px 6px 0 0 ${accent}` }}>
            <SectionTitle icon={<Wallet className="h-4 w-4" />} color={accent}>
              {t("indResultTitle", "Resultado do negócio")}
            </SectionTitle>

            <div className="mt-4 grid gap-5 md:grid-cols-[1.1fr_1fr]">
              <div>
                <p className={LABEL}>
                  {profitPositive ? t("indProfit", "Lucro") : t("indLoss", "Prejuízo")}
                </p>
                <p
                  className="fl-display mt-1 text-5xl leading-none md:text-6xl"
                  style={{ color: profitPositive ? GOOD : BAD }}
                >
                  {money(finance.profit_cents)}
                </p>
                <Delta
                  now={finance.profit_cents}
                  prev={finance.prev.profit_cents}
                  format={money}
                  suffix={vsPrev}
                  t={t}
                />

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Tile label={t("indRevenue", "Receita")} value={money(finance.revenue_cents)} tone={GOOD} />
                  <Tile label={t("indCosts", "Custos")} value={money(finance.cost_cents)} tone={BAD} />
                  <Tile
                    label={t("indMargin", "Margem")}
                    value={finance.margin_pct === null ? "—" : pctText(finance.margin_pct)}
                  />
                </div>

                <dl className="mt-4 space-y-1.5 text-[12px]">
                  <Row label={t("indRevenuePlatform", "Recebido pela Freelandoo")} value={money(finance.platform_revenue_cents)} />
                  <Row label={t("indRevenueManual", "Receitas lançadas por você")} value={money(finance.manual_in_cents)} />
                  <Row label={t("indFixedCost", "Custo fixo por mês")} value={money(finance.fixed_monthly_cost_cents)} />
                </dl>
              </div>

              <div>
                <p className={LABEL}>{t("indMoneyChart", "Entrou × saiu, por dia")}</p>
                <MoneyChart series={series} money={money} dayLabel={dayLabel} />

                {finance.top_costs.length > 0 && (
                  <div className="mt-4">
                    <p className={LABEL}>{t("indTopCosts", "Para onde o dinheiro vai")}</p>
                    <ul className="mt-2 space-y-2">
                      {finance.top_costs.map((c) => (
                        <li key={c.label}>
                          <div className="flex justify-between gap-3 text-[12px]">
                            <span className={cn("truncate font-bold", INK)}>{c.label}</span>
                            <span className={cn("shrink-0 tabular-nums", SUB)}>{money(c.cents)}</span>
                          </div>
                          <div className="mt-1 h-1.5 bg-[rgba(var(--fl-skin-ink-rgb,245,241,232),0.12)]">
                            <div
                              className="h-full"
                              style={{
                                width: `${Math.max(4, (c.cents / finance.top_costs[0].cents) * 100)}%`,
                                background: BAD,
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {!finance.has_entries && (
              <p className={cn("mt-4 border-l-4 border-[#F2B705] pl-3 text-[12px] leading-relaxed", SUB)}>
                {t(
                  "indFinanceEmpty",
                  "Você ainda não lançou nenhum custo deste negócio. Lance aqui (aluguel, material, equipe…) ou marque o lançamento com este negócio na sua Vida Financeira — só assim o lucro é de verdade."
                )}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setEntryDir("out")} className={cn(BTN, "bg-[#F2B705] text-[#0B0B0D]")}>
                <Plus className="h-3.5 w-3.5" /> {t("indAddCost", "Lançar custo")}
              </button>
              <button type="button" onClick={() => setEntryDir("in")} className={cn(BTN, "bg-[#F5F1E8] text-[#0B0B0D]")}>
                <Plus className="h-3.5 w-3.5" /> {t("indAddIncome", "Lançar receita")}
              </button>
              <Link href="/wallet/carteira" className={cn(BTN, TILE, INK)}>
                {t("indOpenFinance", "Ver na Vida Financeira")}
              </Link>
            </div>

            <p className={cn("mt-4 text-[11px] leading-relaxed", SUB)}>
              {t(
                "indFinanceNote",
                "Receita = o que passou pela Freelandoo (sinais e mensalidades, já sem a taxa) + as receitas que você lançou neste negócio. Custos = só os lançamentos marcados com este negócio; os gastos pessoais da Vida Financeira não entram."
              )}
            </p>
          </section>

          {/* ─── 2. OS QUATRO NÚMEROS ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 px-0 md:grid-cols-4">
            <Kpi
              icon={<Eye className="h-4 w-4" />}
              label={t("indKpiVisits", "Visitas no site")}
              value={site.views.toLocaleString(locale)}
              delta={<Delta now={site.views} prev={site.prev.views} t={t} />}
              accent={accent}
            />
            <Kpi
              icon={<TrendingUp className="h-4 w-4" />}
              label={t("indKpiConversion", "Conversão")}
              value={conversion === null ? "—" : pctText(conversion)}
              hint={t("indKpiConversionHint", "das visitas viraram agendamento")}
              delta={
                conversion !== null && prevConversion !== null ? (
                  <Delta now={conversion} prev={prevConversion} t={t} />
                ) : null
              }
              accent={accent}
            />
            <Kpi
              icon={<CalendarCheck className="h-4 w-4" />}
              label={t("indKpiBookings", "Agendamentos")}
              value={team.valid.toLocaleString(locale)}
              delta={<Delta now={team.valid} prev={team.prev_valid} t={t} />}
              accent={accent}
            />
            <Kpi
              icon={<Users className="h-4 w-4" />}
              label={t("indKpiActive", "Membros ativos")}
              value={members.active.toLocaleString(locale)}
              hint={t("indKpiActiveOf", "de {n} membros").replace("{n}", String(members.total))}
              accent={accent}
            />
          </div>

          {/* ─── 3. O FUNIL DO SITE ─────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")}>
            <SectionTitle icon={<Filter className="h-4 w-4" />} color={accent}>
              {t("indFunnelTitle", "Funil do site")}
            </SectionTitle>

            {!community.has_site && canBuildSite ? (
              <>
                <p className={cn("mt-3 text-sm", SUB)}>
                  {t("indSiteNoSite", "Você ainda não publicou o site deste negócio — por isso não há visitas para contar.")}
                </p>
                <Link href={`/comunidades/${communityId}/site`} className={cn(BTN, "mt-3 bg-[#F2B705] text-[#0B0B0D]")}>
                  {t("indSitePublish", "Montar o site")}
                </Link>
              </>
            ) : (
              <>
                <Funnel
                  accent={accent}
                  steps={[
                    { label: t("indFunnelViews", "Entraram no site"), value: site.views },
                    { label: t("indFunnelClicks", "Clicaram em agendar"), value: site.booking_clicks },
                    { label: t("indFunnelBooked", "Agendaram"), value: site.bookings },
                    { label: t("indFunnelPaid", "Pagaram o sinal"), value: site.paid },
                  ]}
                  stepText={(n) => t("indFunnelStep", "{n}% seguiram").replace("{n}", String(n))}
                  locale={locale}
                />
                <p className={cn("mt-3 flex items-center gap-1.5 text-[12px]", SUB)}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("indFunnelWhatsapp", "{n} cliques no botão do WhatsApp").replace(
                    "{n}",
                    String(site.whatsapp_clicks)
                  )}
                </p>
              </>
            )}
          </section>

          {/* ─── 4. A AGENDA ────────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")}>
            <SectionTitle icon={<Clock className="h-4 w-4" />} color={accent}>
              {t("indAgendaTitle", "Agenda")}
            </SectionTitle>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Tile label={t("indAgendaValid", "Agendamentos")} value={String(team.valid)} />
              <Tile
                label={t("indAgendaCanceled", "Cancelados")}
                value={String(team.canceled)}
                hint={
                  cancelRate === null
                    ? undefined
                    : t("indAgendaCancelRate", "{n}% do total").replace("{n}", String(cancelRate))
                }
              />
              <Tile label={t("indAgendaNoShow", "Faltas")} value={String(team.no_show)} />
            </div>

            {bookings.heat.length === 0 ? (
              <p className={cn("mt-4 text-sm", SUB)}>
                {t("indHeatEmpty", "Ainda não há agendamentos no período para mostrar os melhores horários.")}
              </p>
            ) : (
              <>
                <p className={cn(LABEL, "mt-5")}>{t("indBestTimes", "Melhores horários")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bookings.top_slots.map((s, i) => (
                    <span
                      key={`${s.dow}-${s.hour}`}
                      className="border-2 border-[#0B0B0D] px-3 py-1.5 text-[12px] font-extrabold"
                      style={{
                        background: i === 0 ? "#F2B705" : "#F5F1E8",
                        color: "#0B0B0D",
                      }}
                    >
                      {t("indSlotLabel", "{day} às {hour}h")
                        .replace("{day}", weekday(s.dow))
                        .replace("{hour}", String(s.hour).padStart(2, "0"))}
                      {" · "}
                      {s.bookings}
                    </span>
                  ))}
                </div>
                <div className={cn("mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]", SUB)}>
                  {bookings.best_weekday && (
                    <span>
                      {t("indBestWeekday", "Dia mais cheio")}:{" "}
                      <b className={INK}>{weekday(bookings.best_weekday.dow, "long")}</b>
                    </span>
                  )}
                  {bookings.best_hour && (
                    <span>
                      {t("indBestHour", "Horário mais cheio")}:{" "}
                      <b className={INK}>{String(bookings.best_hour.hour).padStart(2, "0")}h</b>
                    </span>
                  )}
                </div>

                <p className={cn(LABEL, "mt-5")}>{t("indHeatTitle", "Quando a agenda enche")}</p>
                <Heatmap heat={bookings.heat} accent={accent} weekday={weekday} />
              </>
            )}

            <p className={cn("mt-4 text-[11px] leading-relaxed", SUB)}>
              {t(
                "indAgendaScopeNote",
                "Conta a agenda de toda a equipe ({n} pessoas), pelo site ou pelo perfil — pela hora marcada. Checkouts abandonados não entram."
              ).replace("{n}", String(team.people))}
            </p>
          </section>

          {/* ─── 5. A COMUNIDADE ────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")}>
            <SectionTitle icon={<Users className="h-4 w-4" />} color={accent}>
              {t("indMembersTitle", "Comunidade")}
            </SectionTitle>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Tile label={t("indMembersTotal", "Membros")} value={String(members.total)} />
              <Tile
                label={t("indMembersNew", "Novos no período")}
                value={String(members.new)}
                extra={<Delta now={members.new} prev={members.new_prev} t={t} />}
              />
              <Tile label={t("indMembersActive", "Ativos")} value={String(members.active)} />
              <Tile label={t("indMembersParticipants", "Publicaram no mural")} value={String(members.participants)} />
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[12px]">
                <span className={SUB}>
                  {t("indMembersActiveShare", "{n}% dos membros apareceram na Freelandoo no período").replace(
                    "{n}",
                    String(activeShare)
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 bg-[rgba(var(--fl-skin-ink-rgb,245,241,232),0.12)]">
                <div className="h-full" style={{ width: `${activeShare}%`, background: accent }} />
              </div>
            </div>
          </section>

          {/* ─── 6. LEADS ───────────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")}>
            <SectionTitle icon={<MessageCircle className="h-4 w-4" />} color={accent}>
              {t("indLeadsTitle", "Leads")}
            </SectionTitle>

            <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className={cn("fl-display text-5xl leading-none", INK)}>{leads.people}</p>
                <p className={cn("mt-1 text-sm", SUB)}>
                  {t("indLeadsPeople", "pessoas te procuraram")} ·{" "}
                  {t("indLeadsMessages", "{n} mensagens").replace("{n}", String(leads.messages))}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Tile
                label={t("indLeadsWhatsapp", "WhatsApp")}
                value={String(leads.whatsapp.people)}
                hint={t("indLeadsMessages", "{n} mensagens").replace("{n}", String(leads.whatsapp.messages))}
              />
              <Tile
                label={t("indLeadsOs", "Solicitações")}
                value={String(leads.os.people)}
                hint={t("indLeadsMessages", "{n} mensagens").replace("{n}", String(leads.os.messages))}
              />
            </div>

            {/* ⚠️ WhatsApp desligado é PENDÊNCIA, não resultado. */}
            {!leads.whatsapp.connected && (
              <Link href="/mensagens?tab=os&os=whatsapp" className={cn(BTN, "mt-3 bg-[#F2B705] text-[#0B0B0D]")}>
                {t("indWhatsappConnect", "Conectar meu WhatsApp")}
              </Link>
            )}

            <p className={cn("mt-4 text-[11px] leading-relaxed", SUB)}>
              {t(
                "indLeadsScopeNote",
                "Estes números são do seu WhatsApp e da sua caixa de solicitações — eles são da sua CONTA, não deste negócio. Se você tem mais de um negócio, o mesmo total aparece nos dois. Conversas em grupo não contam."
              )}
            </p>
          </section>

          {/* ─── 7. POR DIA ─────────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")}>
            <SectionTitle icon={<BarChart3 className="h-4 w-4" />} color={accent}>
              {t("indChartTitle", "Por dia")}
            </SectionTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["views", t("indChartVisits", "Visitas")],
                  ["leads", t("indChartLeads", "Leads")],
                  ["bookings", t("indChartBookings", "Agendamentos")],
                  ["revenue", t("indChartRevenue", "Receita")],
                  ["members", t("indChartMembers", "Novos membros")],
                ] as [Metric, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setMetric(k)}
                  aria-pressed={metric === k}
                  className={cn(
                    "border-2 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em]",
                    metric === k ? "border-[#0B0B0D] text-[#0B0B0D]" : cn(TILE, INK)
                  )}
                  style={metric === k ? { background: accent } : undefined}
                >
                  {label}
                </button>
              ))}
            </div>
            <DailyChart
              series={series}
              metric={metric}
              accent={accent}
              money={money}
              dayLabel={dayLabel}
              emptyText={t("indEmpty", "Ainda não houve movimento no período.")}
              totalText={(v) => t("indChartTotal", "Total no período: {v}").replace("{v}", v)}
            />
          </section>
        </div>
      </div>

      {entryDir && (
        <EntryDialog
          direction={entryDir}
          businessId={communityId}
          onClose={() => setEntryDir(null)}
          onSaved={() => {
            setEntryDir(null)
            void load()
          }}
          t={t}
        />
      )}
    </div>
  )
}

// ───────────────────────────── peças ───────────────────────────────────────

type TFn = (key: string, fallback: string) => string

function SectionTitle({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center border-2 border-[#0B0B0D] text-[#0B0B0D]" style={{ background: color }}>
        {icon}
      </span>
      <h2 className={cn("text-[13px] font-extrabold uppercase tracking-[0.16em]", INK)}>{children}</h2>
    </div>
  )
}

function Tile({
  label,
  value,
  hint,
  tone,
  extra,
}: {
  label: string
  value: string
  hint?: string
  tone?: string
  extra?: React.ReactNode
}) {
  return (
    <div className={cn(TILE, "min-w-0 p-3")}>
      <p className={cn(LABEL, "truncate")}>{label}</p>
      <p
        className={cn("fl-display mt-1 truncate text-xl leading-none md:text-2xl", !tone && INK)}
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </p>
      {hint && <p className={cn("mt-1 text-[11px]", SUB)}>{hint}</p>}
      {extra}
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  hint,
  delta,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  delta?: React.ReactNode
  accent: string
}) {
  return (
    <div className={cn(PANEL, "p-4")} style={{ boxShadow: `4px 4px 0 0 ${accent}` }}>
      <p className={cn(LABEL, "flex items-center gap-1.5")}>
        <span style={{ color: accent }}>{icon}</span>
        {label}
      </p>
      <p className={cn("fl-display mt-2 text-3xl leading-none md:text-4xl", INK)}>{value}</p>
      {hint && <p className={cn("mt-1 text-[11px]", SUB)}>{hint}</p>}
      {delta}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[rgba(var(--fl-skin-edge-rgb,245,241,232),0.18)] pb-1.5">
      <dt className={SUB}>{label}</dt>
      <dd className={cn("font-bold tabular-nums", INK)}>{value}</dd>
    </div>
  )
}

/**
 * A seta do período anterior. Sem base (antes era zero) não existe
 * porcentagem: "+∞%" não quer dizer nada, então vira "novo".
 */
function Delta({
  now,
  prev,
  t,
  format,
  suffix,
}: {
  now: number
  prev: number
  t: TFn
  format?: (n: number) => string
  suffix?: string
}) {
  const diff = now - prev
  let text: string
  if (diff === 0) text = t("indDeltaSame", "igual")
  else if (prev === 0) text = t("indDeltaNew", "novo")
  else if (format) text = `${diff > 0 ? "+" : "−"}${format(Math.abs(diff))}`
  else text = `${diff > 0 ? "+" : "−"}${Math.round((Math.abs(diff) / Math.abs(prev)) * 100)}%`
  const color = diff === 0 ? undefined : diff > 0 ? GOOD : BAD
  const Icon = diff === 0 ? Minus : diff > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <p className={cn("mt-1.5 flex items-center gap-1 text-[11px] font-bold", !color && SUB)} style={color ? { color } : undefined}>
      <Icon className="h-3.5 w-3.5" />
      {text}
      {suffix && <span className={cn("font-normal", SUB)}>{suffix}</span>}
    </p>
  )
}

/** O funil: cada degrau mede contra o PRIMEIRO, e diz quantos % seguiram do anterior. */
function Funnel({
  steps,
  accent,
  stepText,
  locale,
}: {
  steps: { label: string; value: number }[]
  accent: string
  stepText: (n: number) => string
  locale: string
}) {
  const top = Math.max(1, steps[0]?.value || 0)
  return (
    <ol className="mt-4 space-y-2.5">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].value : null
        const pass = prev && prev > 0 ? Math.round((s.value / prev) * 100) : null
        return (
          <li key={s.label}>
            <div className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className={cn("font-bold", INK)}>{s.label}</span>
              <span className="flex items-baseline gap-2">
                {pass !== null && <span className={cn("text-[11px]", SUB)}>{stepText(pass)}</span>}
                <span className={cn("fl-display text-xl leading-none", INK)}>{s.value.toLocaleString(locale)}</span>
              </span>
            </div>
            <div className="mt-1 h-3 bg-[rgba(var(--fl-skin-ink-rgb,245,241,232),0.1)]">
              <div
                className="h-full"
                style={{
                  width: `${s.value > 0 ? Math.max(2, (s.value / top) * 100) : 0}%`,
                  background: accent,
                  opacity: 1 - i * 0.16,
                }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** Dia da semana × hora. As linhas vão de segunda a domingo. */
function Heatmap({
  heat,
  accent,
  weekday,
}: {
  heat: Slot[]
  accent: string
  weekday: (dow: number) => string
}) {
  const hours = heat.map((h) => h.hour)
  const from = Math.min(8, ...hours)
  const to = Math.max(20, ...hours)
  const cols = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const max = Math.max(1, ...heat.map((h) => h.bookings))
  const at = new Map(heat.map((h) => [`${h.dow}-${h.hour}`, h.bookings]))

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="border-separate border-spacing-[3px] text-[10px]">
        <thead>
          <tr>
            <th />
            {cols.map((h) => (
              <th key={h} className={cn("px-0.5 font-bold", SUB)}>
                {String(h).padStart(2, "0")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
            <tr key={dow}>
              <th className={cn("pr-2 text-left font-bold capitalize", SUB)}>{weekday(dow)}</th>
              {cols.map((h) => {
                const n = at.get(`${dow}-${h}`) || 0
                const alpha = n === 0 ? 0 : Math.round(60 + (n / max) * 195)
                return (
                  <td
                    key={h}
                    title={`${weekday(dow)} ${String(h).padStart(2, "0")}h · ${n}`}
                    className="h-6 w-6 min-w-6 border border-[rgba(var(--fl-skin-edge-rgb,245,241,232),0.15)] text-center font-bold text-[#0B0B0D]"
                    style={{
                      background:
                        n === 0
                          ? "rgba(var(--fl-skin-ink-rgb,245,241,232),0.05)"
                          : `${accent}${alpha.toString(16).padStart(2, "0")}`,
                    }}
                  >
                    {n > 0 ? n : ""}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Entrou × saiu: receita para cima, custo para baixo, em torno de uma linha
 * zero. Barras em CSS — biblioteca de gráfico seria centenas de KB para
 * desenhar retângulos.
 */
function MoneyChart({
  series,
  money,
  dayLabel,
}: {
  series: Point[]
  money: (c: number) => string
  dayLabel: (d: string) => string
}) {
  const max = Math.max(1, ...series.map((p) => Math.max(p.revenue_cents, p.cost_cents)))
  return (
    <div className="mt-2">
      <div className="flex h-[140px] items-stretch gap-[2px]">
        {series.map((p) => (
          <div
            key={p.day}
            className="flex min-w-[3px] flex-1 flex-col"
            title={`${dayLabel(p.day)} · +${money(p.revenue_cents)} / −${money(p.cost_cents)}`}
          >
            <div className="flex flex-1 flex-col justify-end">
              <div style={{ height: `${(p.revenue_cents / max) * 100}%`, background: GOOD }} />
            </div>
            <div className="h-[2px] bg-[rgba(var(--fl-skin-ink-rgb,245,241,232),0.5)]" />
            <div className="flex flex-1 flex-col justify-start">
              <div style={{ height: `${(p.cost_cents / max) * 100}%`, background: BAD }} />
            </div>
          </div>
        ))}
      </div>
      <div className={cn("mt-1 flex justify-between text-[10px]", SUB)}>
        <span>{dayLabel(series[0].day)}</span>
        <span>{dayLabel(series[series.length - 1].day)}</span>
      </div>
    </div>
  )
}

function DailyChart({
  series,
  metric,
  accent,
  money,
  dayLabel,
  emptyText,
  totalText,
}: {
  series: Point[]
  metric: Metric
  accent: string
  money: (c: number) => string
  dayLabel: (d: string) => string
  emptyText: string
  totalText: (v: string) => string
}) {
  const valueOf = (p: Point) =>
    metric === "views"
      ? p.views
      : metric === "leads"
        ? p.whatsapp_people + p.os_people
        : metric === "bookings"
          ? p.team_bookings
          : metric === "revenue"
            ? p.revenue_cents
            : p.new_members
  const fmt = (v: number) => (metric === "revenue" ? money(v) : String(v))
  const values = series.map(valueOf)
  const total = values.reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...values)

  if (total === 0) return <p className={cn("mt-4 text-sm", SUB)}>{emptyText}</p>

  return (
    <>
      <p className={cn("mt-3 text-[12px] font-bold", INK)}>{totalText(fmt(total))}</p>
      <div className="mt-3 flex h-[140px] items-end gap-[3px]">
        {series.map((p, i) => (
          <div
            key={p.day}
            className="min-w-[4px] flex-1"
            title={`${dayLabel(p.day)} · ${fmt(values[i])}`}
            style={{ height: `${(values[i] / max) * 100}%`, background: accent, minHeight: values[i] > 0 ? 2 : 0 }}
          />
        ))}
      </div>
      <div className={cn("mt-2 flex justify-between text-[10px]", SUB)}>
        <span>{dayLabel(series[0].day)}</span>
        <span>{dayLabel(series[series.length - 1].day)}</span>
      </div>
    </>
  )
}

/**
 * Lançar custo/receita DO NEGÓCIO sem sair daqui. Grava na MESMA tabela da Vida
 * Financeira, marcado com este negócio (mig 261) — é por isso que o lançamento
 * aparece nos dois lugares, e não existe uma segunda lista de custos.
 */
function EntryDialog({
  direction,
  businessId,
  onClose,
  onSaved,
  t,
}: {
  direction: "in" | "out"
  businessId: string
  onClose: () => void
  onSaved: () => void
  t: TFn
}) {
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [recurrence, setRecurrence] = useState<"oneoff" | "recurring">("oneoff")
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  })
  const [dueDay, setDueDay] = useState("5")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState("")

  const submit = async () => {
    setErr("")
    const name = title.trim()
    if (!name) return setErr(t("indEntryErrName", "Informe uma descrição."))
    const reais = Number(amount.replace(/\./g, "").replace(",", "."))
    const amount_cents = Math.round(reais * 100)
    if (!Number.isFinite(amount_cents) || amount_cents <= 0) {
      return setErr(t("indEntryErrAmount", "Informe um valor válido."))
    }
    const now = new Date()
    const body: Record<string, unknown> = {
      direction,
      recurrence,
      title: name,
      category: name,
      amount_cents,
      id_business_profile: businessId,
    }
    if (recurrence === "oneoff") body.entry_date = date
    else {
      body.due_day = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 1))
      body.ym = now.getFullYear() * 100 + (now.getMonth() + 1)
    }
    setSaving(true)
    try {
      const tk = getToken()
      const r = await fetch("/api/me/wallet/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(tk ? { Authorization: `Bearer ${tk}` } : {}) },
        body: JSON.stringify(body),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) {
        setErr(d?.error || t("indEntryErrSave", "Não deu para salvar agora."))
        return
      }
      onSaved()
    } catch {
      setErr(t("indEntryErrSave", "Não deu para salvar agora."))
    } finally {
      setSaving(false)
    }
  }

  const field = "w-full border-2 border-[#0B0B0D] bg-white px-3 py-2 text-sm text-[#0B0B0D] outline-none focus:border-[#F2B705]"
  const lbl = "mb-1 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]/70"

  return (
    <TabloidDialog
      open
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title={
        direction === "out"
          ? t("indEntryTitleCost", "Novo custo do negócio")
          : t("indEntryTitleIncome", "Nova receita do negócio")
      }
      description={t("indEntryNote", "Ele também aparece na sua Vida Financeira, marcado como deste negócio.")}
      closeLabel={t("indEntryCancel", "Cancelar")}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={cn(BTN, "bg-white text-[#0B0B0D]")}>
            {t("indEntryCancel", "Cancelar")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className={cn(BTN, "bg-[#F2B705] text-[#0B0B0D] disabled:opacity-60")}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("indEntrySave", "Salvar")}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div>
          <label className={lbl} htmlFor="ind-entry-title">
            {t("indEntryName", "Descrição")}
          </label>
          <input
            id="ind-entry-title"
            autoFocus
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              direction === "out"
                ? t("indEntryNamePhCost", "Ex.: aluguel do salão")
                : t("indEntryNamePhIncome", "Ex.: vendas no balcão")
            }
            className={field}
          />
        </div>
        <div>
          <label className={lbl} htmlFor="ind-entry-amount">
            {t("indEntryAmount", "Valor (R$)")}
          </label>
          <input
            id="ind-entry-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className={field}
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              ["oneoff", t("indEntryOnce", "Só esta vez")],
              ["recurring", t("indEntryMonthly", "Todo mês")],
            ] as ["oneoff" | "recurring", string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={recurrence === k}
              onClick={() => setRecurrence(k)}
              className={cn(BTN, recurrence === k ? "bg-[#0B0B0D] text-[#F5F1E8]" : "bg-white text-[#0B0B0D]")}
            >
              {label}
            </button>
          ))}
        </div>
        {recurrence === "oneoff" ? (
          <div>
            <label className={lbl} htmlFor="ind-entry-date">
              {t("indEntryDate", "Data")}
            </label>
            <input id="ind-entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          </div>
        ) : (
          <div>
            <label className={lbl} htmlFor="ind-entry-due">
              {t("indEntryDueDay", "Dia do vencimento")}
            </label>
            <input
              id="ind-entry-due"
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className={field}
            />
          </div>
        )}
        {err && <p className="text-sm font-bold text-[#B91C1C]">{err}</p>}
      </div>
    </TabloidDialog>
  )
}
