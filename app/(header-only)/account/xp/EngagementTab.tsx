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

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
]

const CHANNEL_META: Record<string, { label: string; icon: typeof Film }> = {
  story_trampo: { label: "Stories Trampo", icon: Briefcase },
  story_rest:   { label: "Stories Rest", icon: Coffee },
  bees:         { label: "Bees", icon: Film },
  feed:         { label: "Feed", icon: LayoutGrid },
}

const KIND_LABEL: Record<string, string> = {
  feed: "Feed",
  bees: "Bee",
  story_trampo: "Story · Trampo",
  story_rest: "Story · Rest",
}

function fmt(n: number): string {
  return Number(n || 0).toLocaleString("pt-BR")
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
    <div className="border-2 border-[#F5F1E8]/12 bg-[#15100A] p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2 text-[#9A938A]">
        <Icon className="h-4 w-4 text-[#F2B705]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">{label}</span>
      </div>
      <p className="fl-display mt-2 text-3xl leading-none text-[#F5F1E8]">{value}</p>
      {hint && <p className="mt-1 text-xs text-[#9A938A]">{hint}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="fl-display inline-block -rotate-1 bg-[#F2B705] px-3 py-1 text-lg text-[#1A1505] shadow-[3px_3px_0_0_rgba(0,0,0,0.45)]">
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
        {fmt(value)}{suffix || ""}
      </span>
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────────────────── */

export default function EngagementTab({
  scope, idProfile,
}: { scope: "account" | "profile"; idProfile: string | null }) {
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

  const maxChannel = useMemo(() => {
    if (!data) return 0
    const c = data.views.by_channel
    return Math.max(c.story_trampo, c.story_rest, c.bees, c.feed, 1)
  }, [data])

  const maxHour = useMemo(
    () => (data ? Math.max(...data.active_hours.map((h) => h.count), 1) : 1),
    [data],
  )

  return (
    <div>
      {/* Seletor de período */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-widest text-[#9A938A]">Período</span>
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
            {r.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState description="Não foi possível carregar o engajamento deste perfil." onRetry={load} />
      ) : loading ? (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : !data ? null : data.views.total === 0 && data.interactions.total === 0 && data.followers.total === 0 ? (
        <EmptyState
          icon={<Eye className="h-6 w-6" />}
          title="Ainda sem engajamento"
          description="Quando seu conteúdo (feed, bees e stories) começar a receber visualizações, curtidas e seguidores, as métricas aparecem aqui."
        />
      ) : (
        <div className="space-y-10">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={Eye} label="Visualizações" value={fmt(data.views.total)}
              hint={`${fmtDuration(data.views.retention_seconds)} assistidos`} />
            <KpiCard icon={Heart} label="Interações" value={fmt(data.interactions.total)}
              hint={`${fmt(data.interactions.new_followers)} novos seguidores`} />
            <KpiCard icon={Users} label="Acompanham" value={fmt(data.followers.total)}
              hint={`+${fmt(data.followers.new_in_range)} no período`} />
            <KpiCard icon={MousePointerClick} label="Visitas ao perfil" value={fmt(data.views.profile_visits)} />
          </div>

          {/* Visualizações por canal */}
          <section>
            <SectionTitle>Visualizações por canal</SectionTitle>
            <div className="space-y-3 border-2 border-[#F5F1E8]/10 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
              {(["story_trampo", "story_rest", "bees", "feed"] as const).map((k) => (
                <BarRow
                  key={k}
                  label={CHANNEL_META[k].label}
                  icon={CHANNEL_META[k].icon}
                  value={data.views.by_channel[k]}
                  max={maxChannel}
                />
              ))}
            </div>
          </section>

          {/* Interações (detalhe) */}
          <section>
            <SectionTitle>Interações</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Heart, label: "Curtidas", value: data.interactions.likes },
                { icon: MessageCircle, label: "Comentários", value: data.interactions.comments },
                { icon: Share2, label: "Compartilhamentos", value: data.interactions.shares },
                { icon: Phone, label: "Cliques no WhatsApp", value: data.interactions.whatsapp_clicks },
                { icon: Star, label: "Avaliações", value: data.interactions.reviews },
                { icon: UserPlus, label: "Novos seguidores", value: data.interactions.new_followers },
              ].map((it) => (
                <div key={it.label} className="flex items-center gap-3 rounded-md border-2 border-[#F5F1E8]/10 bg-[#1D1810] p-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.35)]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[#F2B705]/30 bg-[#F2B705]/10 text-[#F2B705]">
                    <it.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="fl-display text-2xl leading-none text-[#F5F1E8]">{fmt(it.value)}</p>
                    <p className="text-xs text-[#9A938A]">{it.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Top conteúdo */}
          {data.top_content.length > 0 && (
            <section>
              <SectionTitle>Conteúdo principal</SectionTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {data.top_content.map((c) => (
                  <div key={`${c.kind}-${c.id}`} className="group relative overflow-hidden border-2 border-[#F5F1E8]/12 bg-[#1D1810] shadow-[3px_3px_0_0_rgba(0,0,0,0.4)]">
                    <div className="aspect-[9/12] w-full overflow-hidden bg-[#0E0B06]">
                      {c.thumb_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.thumb_url} alt={c.caption || "Conteúdo"} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-[#5A554C]"><Film className="h-6 w-6" /></div>
                      )}
                    </div>
                    <span className="absolute left-1.5 top-1.5 rounded bg-[#1A1505]/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#F2B705]">
                      {KIND_LABEL[c.kind] || c.kind}
                    </span>
                    <div className="flex items-center gap-3 px-2 py-1.5 text-[11px] text-[#C9C2B6]">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{fmt(c.views)}</span>
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{fmt(c.likes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Região + Enxame */}
          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <SectionTitle>Por Região (quem te vê)</SectionTitle>
              <div className="space-y-3 border-2 border-[#F5F1E8]/10 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                {data.by_region.length === 0 ? (
                  <p className="text-sm text-[#9A938A]">Sem dados de região ainda.</p>
                ) : (
                  data.by_region.map((r) => (
                    <BarRow key={r.uf} label={r.uf} icon={MapPin}
                      value={r.count} max={data.by_region[0].count} />
                  ))
                )}
              </div>
            </section>

            <section>
              <SectionTitle>Por Enxame (quem te vê)</SectionTitle>
              <div className="space-y-3 border-2 border-[#F5F1E8]/10 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                {data.by_enxame.length === 0 ? (
                  <p className="text-sm text-[#9A938A]">Sem dados de enxame ainda.</p>
                ) : (
                  data.by_enxame.map((e) => (
                    <BarRow key={e.id_machine} label={e.name} icon={Network}
                      value={e.count} max={data.by_enxame[0].count}
                      color={e.color_ring || "#F2B705"} />
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Horários ativos */}
          <section>
            <SectionTitle>Horários mais ativos</SectionTitle>
            <div className="border-2 border-[#F5F1E8]/10 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
              <div className="flex items-end gap-[3px] sm:gap-1.5" style={{ height: 140 }}>
                {data.active_hours.map((h) => (
                  <div key={h.hour} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-sm bg-[#F2B705] transition-all duration-700"
                      style={{ height: `${Math.max(2, (h.count / maxHour) * 120)}px`, opacity: h.count ? 1 : 0.18 }}
                      title={`${h.hour}h — ${fmt(h.count)} views`}
                    />
                    {h.hour % 3 === 0 && (
                      <span className="mt-1 text-[8px] text-[#9A938A]">{h.hour}h</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[#9A938A]">
                <Clock className="h-3.5 w-3.5" /> Visualizações por hora do dia (fuso de Brasília)
              </p>
            </div>
          </section>

          {/* Acompanham / Acompanhados */}
          <section>
            <SectionTitle>Seguidores</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-[#F5F1E8]/12 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Acompanham</p>
                <p className="fl-display mt-1 text-4xl leading-none text-[#F2B705]">{fmt(data.followers.total)}</p>
                <p className="mt-1 text-xs text-[#9A938A]">
                  {scope === "account" ? "Seguidores de todos os seus perfis" : "Seguidores deste perfil"}
                </p>
              </div>
              <div className="border-2 border-[#F5F1E8]/12 bg-[#15100A] p-5 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9A938A]">Acompanhados</p>
                <p className="fl-display mt-1 text-4xl leading-none text-[#F5F1E8]">{fmt(data.following.total)}</p>
                <p className="mt-1 text-xs text-[#9A938A]">Perfis que você segue (nível da conta)</p>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
