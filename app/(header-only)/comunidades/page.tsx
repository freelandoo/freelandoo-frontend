"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Users, Plus, Trophy } from "lucide-react"
import { PageShell, PageHero, EmptyState, LoadingState } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"

type CommunityCard = {
  id_profile: string
  id_machine: number | null
  display_name: string
  avatar_url: string | null
  enxame_name: string | null
  xp_level: number
  member_count: number
}

const inputCls =
  "h-11 w-full rounded-xl border-2 border-[#F5F1E8]/10 bg-[#0B0B0D]/40 px-4 text-sm text-[#F5F1E8] placeholder:text-[#F5F1E8]/40 outline-none focus:border-[#F2B705]/60"

export default function CommunityListPage() {
  const t = useTranslations("Community")
  const tx = useTaxonomy()
  const [communities, setCommunities] = useState<CommunityCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""
      const res = await fetch(`/api/communities${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("loadError", "Erro ao carregar comunidades"))
      setCommunities(Array.isArray(data.communities) ? data.communities : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar comunidades"))
    } finally {
      setLoading(false)
    }
  }, [search, t])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PageShell>
      <PageHero
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
              placeholder={t("searchPlaceholder", "Buscar comunidade...")}
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
            href="/comunidades/criar"
            className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#F2B705]/40 px-4 text-sm font-semibold text-[#F2B705] transition hover:bg-[#F2B705]/10"
          >
            <Plus className="h-4 w-4" /> {t("create", "Criar comunidade")}
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((c) => (
              <Link key={c.id_profile} href={`/comunidades/${c.id_profile}`} className="group block">
                <div className="fl-card fl-hard h-full rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="size-14 ring-2 ring-[#0B0B0D]/10">
                      <AvatarImage src={c.avatar_url || undefined} alt={c.display_name} />
                      <AvatarFallback>{c.display_name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">{c.display_name}</h3>
                      {c.enxame_name ? (
                        <p className="truncate text-xs text-[#F5F1E8]/60">{tx.enxame(null, c.enxame_name)}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-[#F5F1E8]/70">
                    <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.member_count} {t("membersCount", "membros")}</span>
                    <span className="inline-flex items-center gap-1"><Trophy className="h-3.5 w-3.5" /> {t("level", "Nível")} {c.xp_level}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}
