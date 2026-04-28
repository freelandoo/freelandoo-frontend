"use client"

import { useEffect, useState } from "react"
import { Trophy, MapPin, Briefcase, Globe, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type ProfileRanking = {
  position_general: number | null
  position_machine: number | null
  position_city: number | null
  position_profession: number | null
  total_points: number | null
  avg_rating: number | null
  ratings_count: number | null
  visits_count: number | null
  likes_count: number | null
  municipio: string | null
  estado: string | null
  machine_name: string | null
  specialty: string | null
}

type Props = {
  profileId: string
  onClose: () => void
}

function PositionCard({
  icon: Icon,
  label,
  sublabel,
  pos,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  sublabel?: string | null
  pos: number | null
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-muted/40 p-4 text-center">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {sublabel && <span className="text-[10px] text-muted-foreground/80 line-clamp-1">{sublabel}</span>}
      {pos ? (
        <span className="text-2xl font-bold text-primary">#{pos}</span>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">—</span>
      )}
    </div>
  )
}

export function RankingBadgeModal({ profileId, onClose }: Props) {
  const [data, setData] = useState<ProfileRanking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/ranking/public/profile/${profileId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Posição indisponível")
        return r.json()
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [profileId])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Ranking</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <p className="text-sm text-destructive text-center py-4">{error}</p>
          )}

          {data && !loading && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <PositionCard
                  icon={Briefcase}
                  label="Na máquina"
                  sublabel={data.machine_name ?? data.specialty}
                  pos={data.position_machine}
                />
                <PositionCard
                  icon={MapPin}
                  label="Na cidade"
                  sublabel={[data.municipio, data.estado].filter(Boolean).join(", ") || null}
                  pos={data.position_city}
                />
                <PositionCard
                  icon={Globe}
                  label="Geral"
                  pos={data.position_general}
                />
                <PositionCard
                  icon={Trophy}
                  label="Profissão"
                  sublabel={data.specialty}
                  pos={data.position_profession}
                />
              </div>

              <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Pontuação total</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {data.total_points ? Number(data.total_points).toFixed(0) : "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Média de avaliações</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {data.avg_rating && Number(data.avg_rating) > 0
                      ? `${Number(data.avg_rating).toFixed(1)} (${data.ratings_count ?? 0})`
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Visitas</span>
                  <span className="font-semibold tabular-nums text-foreground">{data.visits_count ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Likes no portfólio</span>
                  <span className="font-semibold tabular-nums text-foreground">{data.likes_count ?? 0}</span>
                </div>
              </div>

              {!data.position_general && (
                <p className="text-xs text-muted-foreground text-center">
                  Ranking ainda não calculado para este perfil.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
