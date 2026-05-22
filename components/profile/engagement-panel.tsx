"use client"

import { useEffect, useState } from "react"
import { Eye, Heart, Star, Clock, Trophy, Globe, X, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

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
              fill: full ? "#fbbf24" : half ? "#fbbf2488" : "transparent",
              color: full || half ? "#fbbf24" : "currentColor",
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
        highlight ? "bg-primary/10 ring-1 ring-primary/30" : "bg-muted/50"
      }`}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-2xl font-bold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </span>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

function RankBadge({ pos, label }: { pos: number | null; label: string }) {
  if (!pos) return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/30 p-3 text-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-muted-foreground">—</span>
    </div>
  )
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-primary/10 ring-1 ring-primary/20 p-3 text-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-primary">#{pos}</span>
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
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">
              Engajamento do Perfil
              {data?.season_number != null && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary align-middle">
                  Temporada {data.season_number}
                </span>
              )}
            </h2>
            {data?.updated_at && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Atualizado: {new Date(data.updated_at).toLocaleDateString("pt-BR")}
                {endsAt && <> · zera em {endsAt}</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchEngagement} disabled={loading} aria-label="Atualizar">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          )}

          {loading && !data && (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          )}

          {data && (
            <>
              {/* Métricas principais */}
              <div className="grid grid-cols-2 gap-3">
                <Metric icon={Eye} label="Visitas ao perfil" value={data.visits_count} />
                <Metric icon={Heart} label="Likes no portfólio" value={data.likes_count} />
                <div className="col-span-2 flex flex-col gap-1 rounded-xl bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                      <Star className="h-3.5 w-3.5" />
                      Avaliação média
                    </div>
                    <span className="text-xs text-muted-foreground">{data.ratings_count} avaliações</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-bold">
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
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
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
              <div className="rounded-xl bg-muted/30 p-4 text-xs text-muted-foreground space-y-1.5">
                <p className="font-medium text-foreground mb-1">Como é calculada a pontuação?</p>
                <p>
                  XP e ranking usam <strong className="text-foreground">a mesma pontuação</strong> — os pesos por ação
                  estão no painel admin (XP/curtidas/visitas/avaliações/posts/tempo online etc.).
                </p>
                <div className="flex items-center gap-2"><Trophy className="h-3 w-3 shrink-0" /><span>XP/nível: acumula <strong className="text-foreground">para sempre</strong>.</span></div>
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
