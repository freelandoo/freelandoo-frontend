"use client"

// Aba "Comunidades" do enxame: vitrine de comunidades filtrada por enxame
// (id_machine). Mesma malha edge-to-edge das outras abas (Cursos/Serviços).

import { useEffect, useState } from "react"
import { Loader2, Users } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { CommunityTile, type CommunityTileData } from "@/components/community/community-tile"

interface Props {
  machineId: number | null
  regionId?: number | null
  q?: string | null
}

export function CommunitiesGrid({ machineId, regionId, q }: Props) {
  const t = useTranslations("Search")
  const [items, setItems] = useState<CommunityTileData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (machineId) params.set("id_machine", String(machineId))
    if (regionId) params.set("id_region", String(regionId))
    if (q) params.set("q", q)
    const qs = params.toString()
    fetch(`/api/communities${qs ? `?${qs}` : ""}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Falha ${r.status}`)
        const d = await r.json()
        if (!alive) return
        setItems(Array.isArray(d?.communities) ? d.communities : [])
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar")))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [machineId, regionId, q, t])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }
  if (error) {
    return <div className="px-4 py-10 text-center text-sm text-red-300">{error}</div>
  }
  if (items.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div className="rounded-full border border-white/[0.08] bg-white/[0.02] p-3">
          <Users className="h-5 w-5 text-white/55" />
        </div>
        <p className="mt-4 text-sm font-semibold tracking-tight text-white">{t("noCommunitiesTitle", "Nenhuma comunidade encontrada")}</p>
        <p className="mt-1 text-[13px] text-white/55">
          {t("noCommunitiesHint", "Escolha outro enxame ou crie a sua comunidade.")}
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 gap-px bg-white/[0.03] pb-6 md:max-w-[760px] lg:max-w-none lg:grid-cols-3">
      {items.map((c) => (
        <CommunityTile key={c.id_profile} community={c} />
      ))}
    </div>
  )
}
