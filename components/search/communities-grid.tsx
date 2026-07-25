"use client"

// Aba "Comunidades" do enxame: vitrine de comunidades filtrada por enxame
// (id_machine). Mesma malha edge-to-edge das outras abas (Cursos/Serviços).

import { type RefObject } from "react"
import { Loader2, Users } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { CommunityTile, type CommunityTileData } from "@/components/community/community-tile"
import { InfiniteFooter } from "@/components/search/infinite-footer"
import { useInfiniteFetch } from "@/components/search/use-infinite-fetch"

interface Props {
  machineId: number | null
  regionId?: number | null
  q?: string | null
  /** Container rolável da /search (scroll infinito). */
  rootRef?: RefObject<HTMLElement | null>
}

export function CommunitiesGrid({ machineId, regionId, q, rootRef }: Props) {
  const t = useTranslations("Search")

  const query = (() => {
    const params = new URLSearchParams()
    if (machineId) params.set("id_machine", String(machineId))
    if (regionId) params.set("id_region", String(regionId))
    if (q) params.set("q", q)
    return params.toString()
  })()

  const { items, loading, loadingMore, error, hasMore, sentinelRef } =
    useInfiniteFetch<CommunityTileData>({
      buildUrl: ({ limit, offset }) =>
        `/api/communities?${query}${query ? "&" : ""}limit=${limit}&offset=${offset}`,
      extract: (d) =>
        Array.isArray((d as { communities?: CommunityTileData[] })?.communities)
          ? (d as { communities: CommunityTileData[] }).communities
          : [],
      getId: (c) => c.id_profile,
      filterKey: query,
      pageSize: 24,
      rootRef,
      errorMessage: t("loadError", "Erro ao carregar"),
    })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }
  if (error && items.length === 0) {
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
    <>
      <div className="mx-auto grid w-full max-w-[640px] grid-cols-2 gap-px bg-white/[0.03] md:max-w-[760px] lg:max-w-none lg:grid-cols-3">
        {items.map((c) => (
          <CommunityTile key={c.id_profile} community={c} />
        ))}
      </div>
      <InfiniteFooter ref={sentinelRef} loading={loadingMore} hasMore={hasMore} />
    </>
  )
}
