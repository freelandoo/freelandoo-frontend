"use client"

/**
 * OS INDICADORES DO NEGÓCIO (mig 235) — a tela do pill "Indicadores".
 *
 * Pedido do Alex (2026-09-10): leads do WhatsApp e da O.S., visualizações do
 * site, cliques no botão de agendar e faturamento, "tudo lá".
 *
 * ─── POR QUE UMA PÁGINA, E NÃO UM PAINEL EMBAIXO DO HEADCARD ────────────────
 *
 * A pilha de pills da comunidade tem duas naturezas: Perfil e Mural ABREM
 * PAINEL (são poucos campos e cabem no espaço que sobra), e o Ranking NAVEGA
 * (pódio, lista inteira e temporada não cabem sem empurrar o feed para longe —
 * que é justamente o que os painéis vieram evitar). Indicadores é do segundo
 * tipo: quatro blocos de números e uma série de 90 dias.
 *
 * ─── ⚠️ A TELA PRECISA DIZER DE ONDE CADA NÚMERO VEM ────────────────────────
 *
 * O site, os agendamentos e o faturamento são DESTE negócio. Os leads não: o
 * WhatsApp pende do usuário (mig 223) e a O.S., dos perfis da conta — quem tem
 * dois negócios vê o MESMO total de leads nos dois painéis, porque é o mesmo
 * telefone tocando. O backend marca isso com `scope: "account"`, e é por isso
 * que o bloco de leads carrega a frase explicando. Um número sem essa etiqueta
 * seria lido como "o meu negócio recebeu 12 contatos", que não foi o que
 * ninguém mediu.
 *
 * Pela mesma razão o faturamento diz o que ele é: o sinal do agendamento (o
 * resto é pago no balcão) mais a mensalidade. Chamar isso de "faturamento do
 * mês" seria a mentira mais fácil desta tela.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BarChart3,
  CalendarCheck,
  Eye,
  Loader2,
  MessageCircle,
  MousePointerClick,
  ShieldAlert,
  Wallet,
} from "lucide-react"
import { PageBackLink } from "@/components/tabloide"
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
  revenue_cents: number
}

type Indicators = {
  range: { days: number; since: string; until: string; windows: number[] }
  leads: {
    scope: string
    people: number
    messages: number
    whatsapp: { connected: boolean; status: string | null; people: number; messages: number }
    os: { people: number; messages: number }
  }
  site: { views: number; booking_clicks: number; whatsapp_clicks: number }
  bookings: { total: number; paid: number }
  revenue: {
    gross_cents: number
    net_cents: number
    sources: {
      bookings: { count: number; gross_cents: number; net_cents: number }
      memberships: { count: number; gross_cents: number; net_cents: number }
    }
  }
  series: Point[]
}

const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"

export function CommunityIndicators({ communityId }: { communityId: string }) {
  const t = useTranslations("Community")
  const locale = useLocale()
  const [community, setCommunity] = useState<Community | null>(null)
  const [data, setData] = useState<Indicators | null>(null)
  const [days, setDays] = useState(30)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

  const accent = accentHex(community?.community_theme?.accent)
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
      }),
    [locale]
  )

  /** Rótulo curto do eixo: só dia/mês, que é o que cabe embaixo de uma barra. */
  const dayLabel = useCallback((iso: string) => {
    const [, m, d] = iso.split("-")
    return `${d}/${m}`
  }, [])

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

  const { leads, site, bookings, revenue, series } = data

  // De cada 100 visitas, quantas apertaram agendar. Sem visita não existe taxa
  // — e "0%" ali diria que o site não converte, quando ninguém entrou nele.
  const clickRate =
    site.views > 0 ? Math.round((site.booking_clicks / site.views) * 100) : null

  const maxBar = Math.max(
    1,
    ...series.map((p) => Math.max(p.views, p.whatsapp_messages + p.os_messages))
  )
  const hasMovement = series.some(
    (p) => p.views + p.whatsapp_messages + p.os_messages + p.bookings > 0
  )

  return (
    <div
      style={skinVars}
      className={cn(
        "fl-root relative min-h-[100dvh] overflow-x-clip bg-[#0b0804] pb-24 text-[#F1EDE2]",
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

        <header className="mt-4 px-3">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
            {community.display_name}
          </p>
          <h1 className="fl-display text-4xl leading-[0.85] text-[#F5F1E8] md:text-6xl">
            {t("indTitle", "Indicadores")}
          </h1>
        </header>

        {/* A janela. Lista fechada — é o backend que decide quais existem. */}
        <div className="mt-4 flex gap-2 px-3">
          {data.range.windows.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={cn(
                "border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors",
                w === data.range.days
                  ? "bg-[#F2B705] text-[#0B0B0D]"
                  : "bg-[#1D1810] text-[#9A938A] hover:text-[#F5F1E8]"
              )}
            >
              {t("indRangeDays", "{n} dias").replace("{n}", String(w))}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4 md:space-y-5">
          {/* ─── LEADS ─────────────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")} style={{ boxShadow: `0 0 0 1px ${accent}44` }}>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" style={{ color: accent }} />
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                {t("indLeadsTitle", "Leads")}
              </h2>
            </div>

            <p className="fl-display mt-3 text-5xl leading-none text-[#F5F1E8]">
              {leads.people}
            </p>
            <p className="mt-1 text-sm text-[#9A938A]">
              {t("indLeadsPeople", "pessoas te procuraram")} ·{" "}
              {t("indLeadsMessages", "{n} mensagens").replace("{n}", String(leads.messages))}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  {t("indLeadsWhatsapp", "WhatsApp")}
                </p>
                <p className="fl-display mt-1 text-2xl leading-none text-[#F5F1E8]">
                  {leads.whatsapp.people}
                </p>
                <p className="mt-1 text-[11px] text-[#9A938A]">
                  {t("indLeadsMessages", "{n} mensagens").replace(
                    "{n}",
                    String(leads.whatsapp.messages)
                  )}
                </p>
              </div>
              <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  {t("indLeadsOs", "Solicitações")}
                </p>
                <p className="fl-display mt-1 text-2xl leading-none text-[#F5F1E8]">
                  {leads.os.people}
                </p>
                <p className="mt-1 text-[11px] text-[#9A938A]">
                  {t("indLeadsMessages", "{n} mensagens").replace(
                    "{n}",
                    String(leads.os.messages)
                  )}
                </p>
              </div>
            </div>

            {/* ⚠️ WhatsApp desligado é PENDÊNCIA, não resultado. Sem esta linha,
                o zero seria lido como "ninguém me procurou". */}
            {!leads.whatsapp.connected && (
              <Link
                href="/mensagens?tab=os&os=whatsapp"
                className="mt-3 inline-block border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
              >
                {t("indWhatsappConnect", "Conectar meu WhatsApp")}
              </Link>
            )}

            <p className="mt-4 border-t-2 border-[#0B0B0D] pt-3 text-[11px] leading-relaxed text-[#9A938A]">
              {t(
                "indLeadsScopeNote",
                "Estes números são do seu WhatsApp e da sua caixa de solicitações — eles são da sua CONTA, não deste negócio. Se você tem mais de um negócio, o mesmo total aparece nos dois. Conversas em grupo não contam."
              )}
            </p>
          </section>

          {/* ─── O SITE ────────────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")} style={{ boxShadow: `0 0 0 1px ${accent}44` }}>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" style={{ color: accent }} />
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                {t("indSiteTitle", "O site")}
              </h2>
            </div>

            {!community.has_site && canBuildSite ? (
              <>
                <p className="mt-3 text-sm text-[#9A938A]">
                  {t("indSiteNoSite", "Você ainda não publicou o site deste negócio — por isso não há visitas para contar.")}
                </p>
                <Link
                  href={`/comunidades/${communityId}/site`}
                  className="mt-3 inline-block border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
                >
                  {t("indSitePublish", "Montar o site")}
                </Link>
              </>
            ) : (
              <>
                {/* O FUNIL, na ordem em que acontece: quem chega, quem aperta
                    agendar, quem marca. Lado a lado porque cada número só quer
                    dizer alguma coisa ao lado do anterior. */}
                <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Metric
                    icon={<Eye className="h-4 w-4" />}
                    label={t("indSiteViews", "Visitas")}
                    value={site.views}
                  />
                  <Metric
                    icon={<MousePointerClick className="h-4 w-4" />}
                    label={t("indSiteBookingClicks", "Cliques em agendar")}
                    value={site.booking_clicks}
                  />
                  <Metric
                    icon={<MessageCircle className="h-4 w-4" />}
                    label={t("indSiteWhatsappClicks", "Cliques no WhatsApp")}
                    value={site.whatsapp_clicks}
                  />
                  <Metric
                    icon={<CalendarCheck className="h-4 w-4" />}
                    label={t("indSiteBookings", "Agendamentos")}
                    value={bookings.total}
                    hint={t("indPaidOf", "{paid} pagos").replace("{paid}", String(bookings.paid))}
                  />
                </div>

                {clickRate !== null && (
                  <p className="mt-3 text-[11px] text-[#9A938A]">
                    {t(
                      "indSiteConversion",
                      "De cada 100 visitas, {n} apertaram agendar."
                    ).replace("{n}", String(clickRate))}
                  </p>
                )}
              </>
            )}
          </section>

          {/* ─── FATURAMENTO ───────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")} style={{ boxShadow: `0 0 0 1px ${accent}44` }}>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4" style={{ color: accent }} />
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                {t("indRevenueTitle", "Faturamento")}
              </h2>
            </div>

            <p className="fl-display mt-3 text-5xl leading-none text-[#F5F1E8]">
              {money(revenue.net_cents)}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  {t("indRevenueBookings", "Sinais de agendamento")}
                </p>
                <p className="fl-display mt-1 text-xl leading-none text-[#F5F1E8]">
                  {money(revenue.sources.bookings.net_cents)}
                </p>
                <p className="mt-1 text-[11px] text-[#9A938A]">
                  {t("indPaidCount", "{n} pagos").replace(
                    "{n}",
                    String(revenue.sources.bookings.count)
                  )}
                </p>
              </div>
              <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  {t("indRevenueMemberships", "Mensalidades")}
                </p>
                <p className="fl-display mt-1 text-xl leading-none text-[#F5F1E8]">
                  {money(revenue.sources.memberships.net_cents)}
                </p>
                <p className="mt-1 text-[11px] text-[#9A938A]">
                  {t("indPaymentCount", "{n} pagamentos").replace(
                    "{n}",
                    String(revenue.sources.memberships.count)
                  )}
                </p>
              </div>
            </div>

            <p className="mt-4 border-t-2 border-[#0B0B0D] pt-3 text-[11px] leading-relaxed text-[#9A938A]">
              {t(
                "indRevenueNote",
                "É o que passou pela Freelandoo, já descontada a taxa: o sinal do agendamento (o resto o cliente paga com você) e as mensalidades. O que for vendido fora daqui não entra nesta conta."
              )}
            </p>
          </section>

          {/* ─── A SÉRIE ───────────────────────────────────────────────── */}
          <section className={cn(PANEL, "p-5")} style={{ boxShadow: `0 0 0 1px ${accent}44` }}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: accent }} />
              <h2 className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
                {t("indChartTitle", "Por dia")}
              </h2>
            </div>

            {!hasMovement ? (
              <p className="mt-3 text-sm text-[#9A938A]">
                {t("indEmpty", "Ainda não houve movimento no período.")}
              </p>
            ) : (
              <>
                <div className="mt-3 flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-3" style={{ background: accent }} />
                    {t("indChartVisits", "Visitas")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2 w-3 bg-[#F2B705]" />
                    {t("indChartLeads", "Leads")}
                  </span>
                </div>

                {/* Barras em CSS. Uma biblioteca de gráfico traria centenas de
                    KB para desenhar retângulos de altura proporcional — e este
                    ambiente já paga o preço de ser uma página com feed. */}
                <div className="mt-4 overflow-x-auto">
                  <div className="flex min-w-full items-end gap-[3px]" style={{ height: 140 }}>
                    {series.map((p) => {
                      const leadsDay = p.whatsapp_messages + p.os_messages
                      return (
                        <div
                          key={p.day}
                          className="flex min-w-[6px] flex-1 flex-col justify-end gap-[2px]"
                          title={`${dayLabel(p.day)} · ${p.views} / ${leadsDay}`}
                        >
                          <div
                            style={{
                              height: `${(p.views / maxBar) * 100}%`,
                              background: accent,
                            }}
                          />
                          <div
                            className="bg-[#F2B705]"
                            style={{ height: `${(leadsDay / maxBar) * 100}%` }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-2 flex justify-between text-[10px] text-[#9A938A]">
                  <span>{dayLabel(series[0].day)}</span>
                  <span>{dayLabel(series[series.length - 1].day)}</span>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
        <span className="text-[#9A938A]">{icon}</span>
        {label}
      </p>
      <p className="fl-display mt-1 text-2xl leading-none text-[#F5F1E8]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[#9A938A]">{hint}</p>}
    </div>
  )
}
