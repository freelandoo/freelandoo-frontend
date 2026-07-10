"use client"

/**
 * Aba "Engajamento" da página /account/xp.
 * Painel de métricas no universo Freelandoo (inspirado no analytics do Instagram):
 * views por canal (Stories Trampo/Rest, Bees, Feed), interações, seguidores
 * (acompanham) / seguindo (acompanhados), por Região, por Enxame, top conteúdo
 * e horários ativos. Dados de /api/me/engagement (range 7d/30d/90d).
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Eye, Heart, MessageCircle, Share2, UserPlus, Star, Phone, MousePointerClick,
  Users, Clock, MapPin, Network, Film, LayoutGrid, Briefcase, Coffee,
} from "lucide-react"
import { EmptyState, ErrorState, Skeleton } from "@/components/tabloide"
import { useTranslations, useLocale } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"

type Translator = (key: string, fallback: string) => string
const INTL_TAG: Record<string, string> = { "pt-BR": "pt-BR", en: "en-US", es: "es-ES" }

type Range = "7d" | "30d" | "90d"

type Engagement = {
  range: Range
  scope: "account" | "profile"
  views: {
    total: number
    by_channel: { story_trampo: number; story_rest: number; bees: number; feed: number }
    profile_visits: number
    retention_seconds: number
  }
  interactions: {
    total: number
    likes: number; comments: number; shares: number
    whatsapp_clicks: number; profile_clicks: number; social_clicks: number
    reviews: number; new_followers: number
  }
  followers: { total: number; new_in_range: number }
  following: { total: number }
  by_region: { uf: string; count: number }[]
  by_enxame: { id_machine: number; name: string; color_ring: string | null; count: number }[]
  active_hours: { hour: number; count: number }[]
  top_content: {
    kind: string; id: string; thumb_url: string | null; caption: string | null
    views: number; likes: number; score: number; created_at: string
  }[]
}

const RANGES: { value: Range; days: number }[] = [
  { value: "7d", days: 7 },
  { value: "30d", days: 30 },
  { value: "90d", days: 90 },
]

// Bees v2: o canal story_rest agrega os bees (stories) — o backend soma
// kind='bee' nele; trampo é legado que zera sozinho. "bees" físico = Curtos.
const CHANNEL_META: Record<string, { labelKey: string; label: string; icon: typeof Film }> = {
  story_trampo: { labelKey: "chStoryTrampo", label: "Stories Trampo", icon: Briefcase },
  story_rest:   { labelKey: "chStoryBees", label: "Bees (stories)", icon: Coffee },
  bees:         { labelKey: "chCurtos", label: "Curtos", icon: Film },
  feed:         { labelKey: "chFeed", label: "Feed", icon: LayoutGrid },
}

const KIND_LABEL: Record<string, { labelKey: string; label: string }> = {
  feed: { labelKey: "kindFeed", label: "Feed" },
  bees: { labelKey: "kindCurto", label: "Curto" },
  story_trampo: { labelKey: "kindStoryTrampo", label: "Story · Trampo" },
  story_rest: { labelKey: "kindStoryBee", label: "Bee" },
}

function fmt(n: number, intlTag: string): string {
  return Number(n || 0).toLocaleString(intlTag)
}

function fmtDuration(secs: number): string {
  const s = Math.max(0, Math.round(secs))
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`
  if (s >= 60) return `${Math.floor(s / 60)}min`
  return `${s}s`
}

/* ── Cards / barras ──────────────────────────────────────────────────────── */

function KpiCard({
  icon: Icon, label, value, hint,
}: { icon: typeof Eye; label: string; value: string; hint?: string }) {
  return (
    <div className="flex aspect-square flex-col justify-between border-2 border-[#F5F1E8]/12 bg-[#15100A] p-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] sm:aspect-auto sm:p-4">
      <div className="flex items-center gap-1.5 text-[#9A938A]">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
        <span className="text-[9px] font-bold uppercase leading-tight tracking-[0.12em] sm:text-[10px] sm:tracking-[0.18em]">{label}</span>
      </div>
      <div>
        <p className="fl-display text-2xl leading-none text-[#F5F1E8] sm:text-3xl">{value}</p>
        {hint && <p className="mt-1 text-[10px] leading-tight text-[#9A938A] sm:text-xs">{hint}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="fl-display inline-block -rotate-1 bg-[#F2B705] px-2.5 py-0.5 text-base text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.45)] sm:px-3 sm:py-1 sm:text-lg">
        {children}
      </span>
      <span className="h-[2px] flex-1 bg-[#F5F1E8]/12" />
    </div>
  )
}

function BarRow({
  label, value, max, color, icon: Icon, suffix,
}: {
  label: string; value: number; max: number; color?: string
  icon?: typeof Eye; suffix?: string
}) {
  const locale = useLocale()
  const intlTag = INTL_TAG[locale] || "pt-BR"
  const pct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="flex w-40 shrink-0 items-center gap-2 text-sm text-[#C9C2B6]">
        {Icon && <Icon className="h-4 w-4 text-[#9A938A]" />}
        <span className="truncate">{label}</span>
      </div>
      <div className="h-3 flex-1 overflow-hidden rounded-full border border-[#F5F1E8]/10 bg-[#0E0B06]">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color || "#F2B705" }}
        />
      </div>
      <span className="fl-display w-20 shrink-0 text-right text-base text-[#F5F1E8]">
        {fmt(value, intlTag)}{suffix || ""}
      </span>
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────────────────── */

export default function EngagementTab({
  scope, idProfile,
}: { scope: "account" | "profile"; idProfile: string | null }) {
  const t = useTranslations("Account")
  const tx = useTaxonomy()
  const locale = useLocale()
  const intlTag = INTL_TAG[locale] || "pt-BR"
  const [range, setRange] = useState<Range>("30d")
  const [data, setData] = useState<Engagement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const params = new URLSearchParams({ scope, range })
      if (scope === "profile" && idProfile) params.set("id_profile", idProfile)
      const res = await fetch(`/api/me/engagement?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error("fail")
      setData(await res.json())
    } catch {
      setError(true)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [scope, idProfile, range, token])

  useEffect(() => { void load() }, [load])

  const maxHour = useMemo(
    () => (data ? Math.max(...data.active_hours.map((h) => h.count), 1) : 1),
    [data],
  )

  return (
    <div>
      {/* Seletor de período */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-widest text-[#9A938A]">{t("periodLabel", "Período")}</span>
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-md border-2 px-4 py-1.5 text-sm font-bold transition ${
              range === r.value
                ? "border-[#F2B705] bg-[#F2B705] text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]"
                : "border-[#F5F1E8]/15 bg-[#1D1810] text-[#C9C2B6] hover:border-[#F2B705]/40"
            }`}
          >
            {r.days} {t("daysWord", "dias")}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState description={t("loadEngagementError", "Não foi possível carregar o engajamento deste perfil.")} onRetry={load} />
      ) : loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square sm:aspect-auto sm:h-24" />)}
          </div>
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !data ? null : data.views.total === 0 && data.interactions.total === 0 && data.followers.total === 0 ? (
        <EmptyState
          icon={<Eye className="h-6 w-6" />}
          title={t("noEngagementTitle", "Ainda sem engajamento")}
          description={t("noEngagementDesc", "Quando seu conteúdo (feed, bees e stories) começar a receber visualizações, curtidas e seguidores, as métricas aparecem aqui.")}
        />
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {/* KPIs — quadrados e compactos no mobile, 2×2; 4 colunas no desktop */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <KpiCard icon={Eye} label={t("viewsLabel", "Visualizações")} value={fmt(data.views.total, intlTag)}
              hint={`${fmtDuration(data.views.retention_seconds)} ${t("watched", "assistidos")}`} />
            <KpiCard icon={Heart} label={t("interactionsLabel", "Interações")} value={fmt(data.interactions.total, intlTag)}
              hint={`${fmt(data.interactions.new_followers, intlTag)} ${t("newFollowersLower", "novos seguidores")}`} />
            <KpiCard icon={Users} label={t("followersLabel", "Acompanham")} value={fmt(data.followers.total, intlTag)}
              hint={`+${fmt(data.followers.new_in_range, intlTag)} ${t("inPeriod", "no período")}`} />
            <KpiCard icon={MousePointerClick} label={t("profileVisitsLabel", "Visitas ao perfil")} value={fmt(data.views.profile_visits, intlTag)} />
          </div>

          {/* Visualizações por canal — sem moldura, 4 dados lado a lado */}
          <section>
            <SectionTitle>{t("viewsByChannel", "Visualizações por canal")}</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {(["story_trampo", "story_rest", "bees", "feed"] as const).map((k) => {
                const M = CHANNEL_META[k]
                const Icon = M.icon
                return (
                  <div key={k} className="flex flex-col items-center gap-1 text-center">
                    <Icon className="h-5 w-5 text-[#F2B705]" />
                    <span className="fl-display text-xl leading-none text-[#F5F1E8] sm:text-2xl">
                      {fmt(data.views.by_channel[k], intlTag)}
                    </span>
                    <span className="text-[9px] leading-tight text-[#9A938A] sm:text-[10px]">{t(M.labelKey, M.label)}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Interações — só os ícones com as quantidades */}
          <section>
            <SectionTitle>{t("interactionsLabel", "Interações")}</SectionTitle>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {[
                { icon: Heart, label: t("likesLabel", "Curtidas"), value: data.interactions.likes },
                { icon: MessageCircle, label: t("commentsLabel", "Comentários"), value: data.interactions.comments },
                { icon: Share2, label: t("sharesLabel", "Compartilhamentos"), value: data.interactions.shares },
                { icon: Phone, label: t("whatsappClicksLabel", "Cliques no WhatsApp"), value: data.interactions.whatsapp_clicks },
                { icon: Star, label: t("reviewsLabel", "Avaliações"), value: data.interactions.reviews },
                { icon: UserPlus, label: t("newFollowersLabel", "Novos seguidores"), value: data.interactions.new_followers },
              ].map((it) => (
                <div key={it.label} title={it.label} className="flex items-center justify-center gap-1.5">
                  <it.icon className="h-5 w-5 shrink-0 text-[#F2B705]" />
                  <span className="fl-display text-xl leading-none text-[#F5F1E8]">{fmt(it.value, intlTag)}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Conteúdo principal — tira horizontal com 4 visíveis, sem ocupar vertical */}
          {data.top_content.length > 0 && (
            <section>
              <SectionTitle>{t("topContent", "Conteúdo principal")}</SectionTitle>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-6 sm:overflow-visible sm:pb-0">
                {data.top_content.map((c) => (
                  <div
                    key={`${c.kind}-${c.id}`}
                    className="group relative w-[23%] min-w-[23%] shrink-0 overflow-hidden border-2 border-[#F5F1E8]/12 bg-[#1D1810] sm:w-auto sm:min-w-0"
                  >
                    <div className="aspect-[9/12] w-full overflow-hidden bg-[#0E0B06]">
                      {c.thumb_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.thumb_url} alt={c.caption || t("contentAlt", "Conteúdo")} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[#5A554C]"><Film className="h-5 w-5" /></div>
                      )}
                    </div>
                    <span className="absolute left-1 top-1 rounded bg-[#1A1505]/85 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-[#F2B705]">
                      {KIND_LABEL[c.kind] ? t(KIND_LABEL[c.kind].labelKey, KIND_LABEL[c.kind].label) : c.kind}
                    </span>
                    <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-[#1A1505]/85 px-1 py-0.5 text-[8px] font-bold text-[#F2B705]">
                      <Eye className="h-2.5 w-2.5" />{fmt(c.views, intlTag)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Região + Enxame */}
          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <SectionTitle>{t("byRegionTitle", "Por Região (quem te vê)")}</SectionTitle>
              <div className="space-y-3 border-2 border-[#F5F1E8]/10 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                {data.by_region.length === 0 ? (
                  <p className="text-sm text-[#9A938A]">{t("noRegionData", "Sem dados de região ainda.")}</p>
                ) : (
                  data.by_region.map((r) => (
                    <BarRow key={r.uf} label={r.uf} icon={MapPin}
                      value={r.count} max={data.by_region[0].count} />
                  ))
                )}
              </div>
            </section>

            <section>
              <SectionTitle>{t("byEnxameTitle", "Por Enxame (quem te vê)")}</SectionTitle>
              <div className="space-y-3 border-2 border-[#F5F1E8]/10 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                {data.by_enxame.length === 0 ? (
                  <p className="text-sm text-[#9A938A]">{t("noEnxameData", "Sem dados de enxame ainda.")}</p>
                ) : (
                  data.by_enxame.map((e) => (
                    <BarRow key={e.id_machine} label={tx.enxame(null, e.name)} icon={Network}
                      value={e.count} max={data.by_enxame[0].count}
                      color={e.color_ring || "#F2B705"} />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Horários ativos — barras retas alinhadas, horários em linha própria abaixo */}
          <section>
            <SectionTitle>{t("activeHoursTitle", "Horários mais ativos")}</SectionTitle>
            <div className="border-2 border-[#F5F1E8]/10 bg-[#15100A] p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
              {/* Barras: baseline única (items-end) + altura em % do container */}
              <div className="flex items-end gap-[2px]" style={{ height: 110 }}>
                {data.active_hours.map((h) => (
                  <div
                    key={h.hour}
                    className="flex-1 bg-[#F2B705]"
                    style={{ height: `${Math.max(2, (h.count / maxHour) * 100)}%`, opacity: h.count ? 1 : 0.18 }}
                    title={`${h.hour}h — ${fmt(h.count, intlTag)} views`}
                  />
                ))}
              </div>
              {/* Horários alinhados embaixo das barras (a cada 6h) */}
              <div className="mt-1.5 flex gap-[2px]">
                {data.active_hours.map((h) => (
                  <span key={h.hour} className="flex-1 text-center text-[8px] tabular-nums text-[#9A938A]">
                    {h.hour % 6 === 0 ? `${h.hour}h` : ""}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#9A938A]">
                <Clock className="h-3.5 w-3.5" /> {t("hoursHint", "Visualizações por hora do dia (fuso de Brasília)")}
              </p>
            </div>
          </section>

          {/* Acompanham / Acompanhados */}
          <section>
            <SectionTitle>{t("followersTitle", "Seguidores")}</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-[#F5F1E8]/12 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">{t("followersLabel", "Acompanham")}</p>
                <p className="fl-display mt-1 text-4xl leading-none text-[#F2B705]">{fmt(data.followers.total, intlTag)}</p>
                <p className="mt-1 text-xs text-[#9A938A]">
                  {scope === "account" ? t("followersAllProfiles", "Seguidores de todos os seus perfis") : t("followersThisProfile", "Seguidores deste perfil")}
                </p>
              </div>
              <div className="border-2 border-[#F5F1E8]/12 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">{t("followingLabel", "Acompanhados")}</p>
                <p className="fl-display mt-1 text-4xl leading-none text-[#F5F1E8]">{fmt(data.following.total, intlTag)}</p>
                <p className="mt-1 text-xs text-[#9A938A]">{t("followingHint", "Perfis que você segue (nível da conta)")}</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
