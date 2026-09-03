"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Search, Users, Plus } from "lucide-react"
import { PageShell, PageHero, PageBackLink, EmptyState, LoadingState } from "@/components/tabloide"
import { CommunityTile, type CommunityTileData } from "@/components/community/community-tile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

type CommunityCard = CommunityTileData & {
  id_machine: number | null
}

type Kind = "" | "common" | "condo" | "pet" | "car" | "games"

const inputCls =
  "h-11 w-full rounded-xl border-2 border-[#F5F1E8]/10 bg-[#0B0B0D]/40 px-4 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/40 outline-none focus:border-[#F2B705]/60"

export default function CommunityListPage() {
  const t = useTranslations("Community")
  const [communities, setCommunities] = useState<CommunityCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Vitrine é superfície de DESCOBERTA: gateia só pela flag do admin, nunca
  // pela preferência pessoal — esconder o pet dos outros porque EU desliguei o
  // meu seria decidir pelo visitante (regra da vitrine × lado comprador).
  const condoOn = useFeature("condominio")
  const petOn = useFeature("pet")
  const carOn = useFeature("carro")
  const gamesOn = useFeature("games")
  const [search, setSearch] = useState("")
  // Modalidade (migs 196/210): "" = todas. Condomínio é achado por nome OU
  // endereço; pet, carro e games são achados por nome ou pelo assunto.
  const [kind, setKind] = useState<Kind>("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("q", search.trim())
      if (kind) params.set("kind", kind)
      const qs = params.toString() ? `?${params.toString()}` : ""
      const res = await fetch(`/api/communities${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("loadError", "Erro ao carregar comunidades"))
      setCommunities(Array.isArray(data.communities) ? data.communities : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar comunidades"))
    } finally {
      setLoading(false)
    }
  }, [search, kind, t])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PageShell>
      <PageHero
        back={<PageBackLink href="/account" />}
        kicker={<><Users className="h-3.5 w-3.5" /> {t("pageTitle", "Comunidades")}</>}
        title={t("pageTitle", "Comunidades")}
        subtitle={t("pageSubtitle", "Encontre e participe de comunidades.")}
        doodle={false}
      />

      <div className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              className={inputCls}
              placeholder={t("searchPlaceholderWithAddress", "Buscar por nome ou endereço...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label={t("searchPlaceholder", "Buscar comunidade...")}
            className="flex h-11 items-center justify-center rounded-xl bg-[#F2B705] px-4 text-[#1A1505] transition hover:bg-[#ffc81f] disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
          </button>
          <Link
            href="/search?tab=communities"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#F5F1E8]/15 px-4 text-sm font-semibold text-[#F5F1E8] transition hover:border-[#F2B705] hover:text-[#F2B705]"
          >
            <Users className="h-4 w-4" /> {t("browseByEnxame", "Buscar por enxame")}
          </Link>
          <Link
            href="/comunidades/criar"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#F2B705]/40 px-4 text-sm font-semibold text-[#F2B705] transition hover:bg-[#F2B705]/10"
          >
            <Plus className="h-4 w-4" /> {t("create", "Criar comunidade")}
          </Link>
        </div>

        {/* Tipo. Academia tem vitrine própria; as modalidades da mig 210 entram
            aqui e cada uma respeita o kill-switch dela. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(
            [
              ["", t("kindAll", "Todos"), true],
              ["common", t("kindCommon", "Comunidade"), true],
              ["condo", t("kindCondo", "Condomínio"), condoOn],
              ["pet", t("kindPet", "Pet"), petOn],
              ["car", t("kindCar", "Carro"), carOn],
              ["games", t("kindGames", "Games"), gamesOn],
            ] as [Kind, string, boolean][]
          )
            .filter(([, , on]) => on)
            .map(([key, label]) => (
            <button
              key={key || "all"}
              type="button"
              onClick={() => setKind(key)}
              className="border-2 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] transition"
              style={{
                borderColor: kind === key ? "#F2B705" : "rgba(245,241,232,0.15)",
                color: kind === key ? "#F2B705" : "rgba(245,241,232,0.7)",
              }}
            >
              {label}
            </button>
          ))}
          <Link
            href="/academias"
            className="border-2 border-[#F5F1E8]/15 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8]/70 transition hover:border-[#F2B705] hover:text-[#F2B705]"
          >
            {t("kindAcademy", "Academia")}
          </Link>
        </div>

        {loading ? (
          <div className="py-16"><LoadingState label={t("pageTitle", "Comunidades")} /></div>
        ) : error ? (
          <div className="py-16">
            <EmptyState icon={<Users className="h-6 w-6" />} title={t("loadError", "Erro ao carregar comunidades")} description={error} />
          </div>
        ) : communities.length === 0 ? (
          <div className="py-16">
            <EmptyState icon={<Users className="h-6 w-6" />} title={t("empty", "Nenhuma comunidade ainda.")} description={t("pageSubtitle", "Encontre e participe de comunidades.")} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-px bg-white/[0.03] sm:grid-cols-3 lg:grid-cols-4">
            {communities.map((c) => (
              <CommunityTile key={c.id_profile} community={c} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
