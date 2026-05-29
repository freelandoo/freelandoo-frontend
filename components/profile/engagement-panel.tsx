"use client"

import { useEffect, useState } from "react"
import { Eye, Heart, Star, Clock, Trophy, Globe, X, RefreshCw } from "lucide-react"

type EngagementData = {
  total_points: number
  visits_count: number
  likes_count: number
  ratings_count: number
  avg_rating: number
  online_minutes: number
  position_general: number | null
  position_machine: number | null
  position_city: number | null
  position_profession: number | null
  updated_at: string | null
  // Temporada e pesos vêm juntos pra o painel mostrar números corretos.
  season_number?: number | null
  season_started_at?: string | null
  period_days?: number | null
  online_minute_xp?: number | null
  max_online_minutes?: number | null
}

type Props = {
  profileId: string
  onClose: () => void
}

function StarDisplay({ value }: { value: number }) {
  const filled = Math.round(value * 2) / 2
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const full = i + 1 <= Math.floor(filled)
        const half = !full && i < filled
        return (
          <Star
            key={i}
            className="h-4 w-4"
            style={{
              fill: full ? "#E0A500" : half ? "#E0A50088" : "transparent",
              color: full || half ? "#E0A500" : "rgba(11,11,13,0.25)",
            }}
          />
        )
      })}
    </span>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-xl p-4 ${
        highlight ? "bg-[#F2B705]/15 ring-2 ring-[#E0A500]/40" : "bg-[#0B0B0D]/[0.04] ring-1 ring-[#0B0B0D]/10"
      }`}
    >
      <div className="flex items-center gap-2 text-[#5b554b] text-xs font-bold">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-2xl font-bold tabular-nums text-[#0B0B0D]">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </span>
      {sub && <span className="text-[11px] text-[#5b554b]">{sub}</span>}
    </div>
  )
}

function RankBadge({ pos, label }: { pos: number | null; label: string }) {
  if (!pos) return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-[#0B0B0D]/[0.04] p-3 text-center">
      <span className="text-xs text-[#5b554b]">{label}</span>
      <span className="text-sm font-bold text-[#5b554b]">—</span>
    </div>
  )
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-[#F2B705]/15 ring-2 ring-[#E0A500]/30 p-3 text-center">
      <span className="text-xs text-[#5b554b]">{label}</span>
      <span className="text-lg font-bold text-[#E0A500]">#{pos}</span>
    </div>
  )
}

function seasonEndsAt(started: string | null | undefined, periodDays: number | null | undefined): string | null {
  if (!started || !periodDays) return null
  const t = new Date(started).getTime()
  if (Number.isNaN(t)) return null
  return new Date(t + periodDays * 86_400_000).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  })
}

export function EngagementPanel({ profileId, onClose }: Props) {
  const [data, setData] = useState<EngagementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEngagement = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/ranking/engagement/${profileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Não foi possível carregar os dados.")
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  // O heartbeat agora roda no layout raiz (<OnlineHeartbeat />) — não precisa
  // mais ser disparado daqui. O painel só lê os dados.
  useEffect(() => {
    fetchEngagement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  // Cálculos de tempo online baseados nos pesos reais (xp_settings).
  const onlineMinXp = Number(data?.online_minute_xp ?? 0)
  const maxOnline = Number(data?.max_online_minutes ?? 0)
  const onlineMinutes = Number(data?.online_minutes ?? 0)
  const onlinePointsToday = Math.min(onlineMinutes, maxOnline || onlineMinutes) * onlineMinXp
  const endsAt = seasonEndsAt(data?.season_started_at ?? null, data?.period_days ?? null)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#F1EDE2] border-2 border-[#0B0B0D] text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-[#0B0B0D]/15">
          <div>
            <h2 className="fl-display text-xl text-[#0B0B0D]">
              Engajamento do Perfil
              {data?.season_number != null && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full border-2 border-[#0B0B0D] bg-[#F2B705] px-2 py-0.5 text-[11px] font-bold text-[#1A1505] align-middle">
                  Temporada {data.season_number}
                </span>
              )}
            </h2>
            {data?.updated_at && (
              <p className="text-xs text-[#5b554b] mt-0.5">
                Atualizado: {new Date(data.updated_at).toLocaleDateString("pt-BR")}
                {endsAt && <> · zera em {endsAt}</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={fetchEngagement}
              disabled={loading}
              aria-label="Atualizar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0B0B0D]/60 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D] disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0B0B0D]/60 transition hover:bg-[#0B0B0D]/10 hover:text-[#0B0B0D]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <p className="text-sm font-medium text-[#b91c1c] text-center py-4">{error}</p>
          )}

          {loading && !data && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-[#0B0B0D]/[0.06] animate-pulse" />
              ))}
            </div>
          )}

          {data && (
            <>
              {/* Métricas principais */}
              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Eye} label="Visitas ao perfil" value={data.visits_count} />
                <Metric icon={Heart} label="Likes no portfólio" value={data.likes_count} />
                <div className="col-span-2 flex flex-col gap-1 rounded-xl bg-[#0B0B0D]/[0.04] ring-1 ring-[#0B0B0D]/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#5b554b] text-xs font-bold">
                      <Star className="h-3.5 w-3.5" />
                      Avaliação média
                    </div>
                    <span className="text-xs text-[#5b554b]">{data.ratings_count} avaliações</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-bold text-[#0B0B0D]">
                      {data.avg_rating > 0 ? Number(data.avg_rating).toFixed(1) : "—"}
                    </span>
                    {data.avg_rating > 0 && <StarDisplay value={Number(data.avg_rating)} />}
                  </div>
                </div>
                <Metric
                  icon={Clock}
                  label="XP por logar hoje"
                  value={Math.round(onlinePointsToday)}
                  sub={
                    onlineMinXp > 0
                      ? `${onlineMinutes} min online (${onlineMinXp} XP/min${maxOnline ? `, teto ${maxOnline} min/dia` : ""})`
                      : `${onlineMinutes} min online`
                  }
                />
                <Metric
                  icon={Trophy}
                  label={data.season_number != null ? `Pontuação — Temporada ${data.season_number}` : "Pontuação da temporada"}
                  value={Number(data.total_points).toFixed(0)}
                  highlight
                />
              </div>

              {/* Posições no ranking */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#5b554b] mb-3">
                  Posições no ranking
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <RankBadge pos={data.position_general} label="Geral" />
                  <RankBadge pos={data.position_machine} label="Enxame" />
                  <RankBadge pos={data.position_city} label="Cidade" />
                  <RankBadge pos={data.position_profession} label="Profissão" />
                </div>
              </div>

              {/* Legenda — uma só pontuação (XP = Ranking) */}
              <div className="rounded-xl bg-[#0B0B0D]/[0.04] ring-1 ring-[#0B0B0D]/10 p-4 text-xs text-[#5b554b] space-y-1.5">
                <p className="font-bold text-[#0B0B0D] mb-1">Como é calculada a pontuação?</p>
                <p>
                  XP e ranking usam <strong className="text-[#0B0B0D]">a mesma pontuação</strong> — os pesos por ação
                  estão no painel admin (XP/curtidas/visitas/avaliações/posts/tempo online etc.).
                </p>
                <div className="flex items-center gap-2"><Trophy className="h-3 w-3 shrink-0" /><span>XP/nível: acumula <strong className="text-[#0B0B0D]">para sempre</strong>.</span></div>
                <div className="flex items-center gap-2"><Globe className="h-3 w-3 shrink-0" /><span>Ranking: soma só a temporada atual e zera ao virar.</span></div>
                <div className="flex items-center gap-2"><Clock className="h-3 w-3 shrink-0" /><span>Tempo online conta em qualquer página enquanto a aba estiver visível, até o teto diário.</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
