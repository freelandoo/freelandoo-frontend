"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Trophy, MapPin, Briefcase, Globe, X, Loader2, Star, Eye, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildProfileUrl } from "@/lib/slug"

type ProfileMeta = {
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
  id_machine: number | null
  machine_name: string | null
  machine_slug: string | null
  id_category: number | null
  profession_slug: string | null
  specialty: string | null
}

type TopRow = {
  id_profile: string
  display_name: string
  avatar_url: string | null
  username: string | null
  sub_profile_slug: string | null
  municipio: string | null
  estado: string | null
  specialty: string | null
  profession_slug: string | null
  machine_slug: string | null
  machine_name: string | null
  total_points: number | null
  avg_rating: number | null
  ratings_count: number | null
  visits_count: number | null
  likes_count: number | null
}

type TabKey = "machine" | "city" | "general" | "profession"

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "machine", label: "Na enxame", icon: Briefcase },
  { key: "city", label: "Na cidade", icon: MapPin },
  { key: "general", label: "Geral", icon: Globe },
  { key: "profession", label: "Profissão", icon: Trophy },
]

type Props = {
  profileId: string
  onClose: () => void
}

function rowHref(row: TopRow): string {
  if (row.username && row.profession_slug) {
    return buildProfileUrl({
      profession_slug: row.profession_slug,
      municipio: row.municipio,
      handle: row.username,
      sub_profile_slug: row.sub_profile_slug ?? null,
    })
  }
  return `/freelancer/${row.id_profile}`
}

function TopList({ rows, loading, empty }: { rows: TopRow[]; loading: boolean; empty: string }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!rows.length) {
    return <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>
  }
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const rank = i + 1
        const initials = (r.display_name || "?")
          .split(" ")
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
        return (
          <li key={r.id_profile}>
            <Link
              href={rowHref(r)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-3 py-2.5 transition hover:border-primary/40 hover:bg-card"
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  rank === 1
                    ? "bg-primary text-primary-foreground"
                    : rank === 2
                    ? "bg-muted-foreground/30 text-foreground"
                    : rank === 3
                    ? "bg-orange-500/30 text-orange-200"
                    : "bg-muted/40 text-muted-foreground"
                }`}
              >
                #{rank}
              </span>
              {r.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.avatar_url}
                  alt={r.display_name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40 text-xs font-semibold text-muted-foreground">
                  {initials || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.display_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {[r.specialty, r.municipio && r.estado ? `${r.municipio}, ${r.estado}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="hidden flex-col items-end text-[10px] text-muted-foreground sm:flex">
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400" />
                  {r.avg_rating && Number(r.avg_rating) > 0 ? Number(r.avg_rating).toFixed(1) : "—"}
                </span>
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {r.visits_count ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {r.likes_count ?? 0}
                  </span>
                </span>
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function RankingBadgeModal({ profileId, onClose }: Props) {
  const [meta, setMeta] = useState<ProfileMeta | null>(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState<string | null>(null)

  const [tab, setTab] = useState<TabKey>("machine")
  const [tops, setTops] = useState<Record<TabKey, TopRow[] | null>>({
    machine: null,
    city: null,
    general: null,
    profession: null,
  })
  const [tabLoading, setTabLoading] = useState<Record<TabKey, boolean>>({
    machine: false,
    city: false,
    general: false,
    profession: false,
  })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/ranking/public/profile/${profileId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Posição indisponível")
        return r.json()
      })
      .then((d) => { if (!cancelled) setMeta(d) })
      .catch((e) => { if (!cancelled) setMetaError(e.message) })
      .finally(() => { if (!cancelled) setMetaLoading(false) })
    return () => { cancelled = true }
  }, [profileId])

  const tabUrl = useMemo<Record<TabKey, string | null>>(() => {
    if (!meta) return { machine: null, city: null, general: null, profession: null }
    return {
      machine: meta.machine_slug
        ? `/api/ranking/public/machine/${encodeURIComponent(meta.machine_slug)}?limit=10`
        : null,
      city:
        meta.municipio && meta.estado
          ? `/api/ranking/public/city?municipio=${encodeURIComponent(
              meta.municipio
            )}&estado=${encodeURIComponent(meta.estado)}&limit=10`
          : null,
      general: `/api/ranking/public/general?limit=10`,
      profession: meta.profession_slug
        ? `/api/ranking/public/profession/${encodeURIComponent(meta.profession_slug)}?limit=10`
        : null,
    }
  }, [meta])

  useEffect(() => {
    if (!meta) return
    if (tops[tab] !== null) return
    const url = tabUrl[tab]
    if (!url) {
       
      setTops((p) => ({ ...p, [tab]: [] }))
      return
    }
    let cancelled = false
     
    setTabLoading((p) => ({ ...p, [tab]: true }))
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        if (cancelled) return
        setTops((p) => ({ ...p, [tab]: Array.isArray(d) ? d : [] }))
      })
      .catch(() => {
        if (cancelled) return
        setTops((p) => ({ ...p, [tab]: [] }))
      })
      .finally(() => {
        if (!cancelled) setTabLoading((p) => ({ ...p, [tab]: false }))
      })
    return () => { cancelled = true }
  }, [tab, meta, tabUrl, tops])

  const tabSubtitle: Record<TabKey, string | null> = {
    machine: meta?.machine_name ?? meta?.specialty ?? null,
    city: meta?.municipio && meta?.estado ? `${meta.municipio}, ${meta.estado}` : null,
    general: "Todos os perfis",
    profession: meta?.specialty ?? null,
  }

  const myPosition: Record<TabKey, number | null> = {
    machine: meta?.position_machine ?? null,
    city: meta?.position_city ?? null,
    general: meta?.position_general ?? null,
    profession: meta?.position_profession ?? null,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Ranking — Top 10</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {metaLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {metaError && !metaLoading && (
          <p className="text-sm text-destructive text-center py-6">{metaError}</p>
        )}

        {meta && !metaLoading && (
          <>
            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
              {TABS.map(({ key, label, icon: Icon }) => {
                const active = tab === key
                const pos = myPosition[key]
                return (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                    {pos && (
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                          active ? "bg-primary-foreground/20" : "bg-foreground/10"
                        }`}
                      >
                        #{pos}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Subtitle */}
            {tabSubtitle[tab] && (
              <p className="px-6 pt-3 text-xs text-muted-foreground">
                {TABS.find((t) => t.key === tab)?.label} ·{" "}
                <span className="text-foreground/70">{tabSubtitle[tab]}</span>
              </p>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4">
              <TopList
                rows={tops[tab] ?? []}
                loading={tabLoading[tab] || tops[tab] === null}
                empty={
                  tabUrl[tab] === null
                    ? "Sem dados disponíveis pra este perfil."
                    : "Nenhum profissional no ranking ainda."
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
