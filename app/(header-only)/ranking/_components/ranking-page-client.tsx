"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react"
import Link from "next/link"
import gsap from "gsap"
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  Eye,
  Globe2,
  Loader2,
  MapPin,
  Star,
  Trophy,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RegionFilterSheet } from "@/components/feed/region-filter-sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  findSeedMachine,
  useMachinesCatalog,
  type CatalogMachine,
} from "@/components/home/machines/use-machines-catalog"
import {
  YellowHighlight,
  Spark,
  Underline,
  Halftone,
} from "@/components/home/landing/primitives"
import { buildProfileUrl, slugify } from "@/lib/slug"
import { cn } from "@/lib/utils"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"
import { RankingPodium } from "./ranking-podium"
import { AnimatedNumber } from "./ranking-ui"
import {
  RankingSocialActions,
  RankingSocialPanel,
  emptySummary,
  useRankingSocial,
  type RankingSocialSummary,
  type RankingSocialTarget,
} from "./ranking-social"

type RankingScope = "general" | "machine" | "profession" | "region"

type RankingRow = {
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
  ranking_score?: number | null
  rank_position?: number | null
  avg_rating: number | null
  ratings_count: number | null
  visits_count: number | null
  likes_count: number | null
  is_clan?: boolean
  entity_type?: "profile" | "clan"
  xp_total?: number | null
  xp_level?: number | null
  level?: number | null
  xp_current_level?: number | null
  xp_next_level?: number | null
  xp_progress_percent?: number | null
  ranking_updated_at?: string | null
  last_recalculated_at?: string | null
  members_count?: number | null
}

type ProfessionOption = {
  slug: string
  label: string
  machineName: string
}

type RankingState = {
  key: string
  rows: RankingRow[]
  error: string | null
}

const scopeOptions: {
  key: RankingScope
  labelKey: string
  label: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { key: "general", labelKey: "scopeGeral", label: "Geral", icon: Globe2 },
  { key: "machine", labelKey: "scopeEnxame", label: "Enxame", icon: Building2 },
  { key: "profession", labelKey: "scopeProfissao", label: "Profissão", icon: Briefcase },
  { key: "region", labelKey: "scopeRegiao", label: "Região", icon: MapPin },
]

const numberFormatter = new Intl.NumberFormat("pt-BR")

function getInitials(name: string | null | undefined) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function rowHref(row: RankingRow) {
  if (row.is_clan) return `/clans/${row.id_profile}`
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

function activeMachineTheme(machine: CatalogMachine | null | undefined) {
  const seed = findSeedMachine(String(machine?.slug ?? ""))
  return {
    accent: machine?.color_accent || seed?.colors.accent || "#e6b800",
    ring: machine?.color_ring || seed?.colors.ring || "rgba(230,184,0,0.55)",
    glow: machine?.color_glow || seed?.colors.glow || "rgba(230,184,0,0.35)",
  }
}

function buildProfessionOptions(machines: CatalogMachine[]): ProfessionOption[] {
  const map = new Map<string, ProfessionOption>()
  machines.forEach((machine) => {
    machine.categories
      .filter((category) => category.is_active !== false)
      .forEach((category) => {
        const slug = slugify(category.desc_category)
        if (!slug || map.has(slug)) return
        map.set(slug, {
          slug,
          label: category.desc_category,
          machineName: machine.name,
        })
      })
  })
  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR")
  )
}

function normalizeRows(data: unknown): RankingRow[] {
  if (Array.isArray(data)) return data as RankingRow[]
  if (data && typeof data === "object") {
    const record = data as { rows?: unknown; rankings?: unknown; items?: unknown }
    if (Array.isArray(record.rows)) return record.rows as RankingRow[]
    if (Array.isArray(record.rankings)) return record.rankings as RankingRow[]
    if (Array.isArray(record.items)) return record.items as RankingRow[]
  }
  return []
}

export function RankingPageClient() {
  const t = useTranslations("Ranking")
  const tx = useTaxonomy()
  const rootRef = useRef<HTMLElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const { machines } = useMachinesCatalog()
  const rankedMachines = useMemo(
    () =>
      machines
        .filter((machine) => machine.is_active !== false)
        .filter((machine) => machine.slug !== "oportunidades"),
    [machines]
  )
  const professions = useMemo(
    () => buildProfessionOptions(rankedMachines),
    [rankedMachines]
  )

  const [scope, setScope] = useState<RankingScope>("general")
  const [machineSlug, setMachineSlug] = useState("views")
  const [professionSlug, setProfessionSlug] = useState("")
  const [regionState, setRegionState] = useState<string | null>("SP")
  const [regionId, setRegionId] = useState<number | null>(null)
  const [regionName, setRegionName] = useState<string | null>(null)
  const [rankingState, setRankingState] = useState<RankingState>({
    key: "",
    rows: [],
    error: null,
  })

  const selectedMachine =
    rankedMachines.find((machine) => machine.slug === machineSlug) ??
    rankedMachines[0] ??
    null
  const selectedProfession =
    professions.find((profession) => profession.slug === professionSlug) ??
    professions[0] ??
    null
  const theme = activeMachineTheme(selectedMachine)

  const rankingUrl = useMemo(() => {
    if (scope === "general") return "/api/ranking/public/general?limit=10"
    if (scope === "machine" && selectedMachine) {
      return `/api/ranking/public/machine/${encodeURIComponent(
        String(selectedMachine.slug)
      )}?limit=10`
    }
    if (scope === "profession" && selectedProfession) {
      return `/api/ranking/public/profession/${encodeURIComponent(
        selectedProfession.slug
      )}?limit=10`
    }
    if (scope === "region" && regionId) {
      const qs = new URLSearchParams({
        id_region: String(regionId),
        limit: "10",
      })
      return `/api/ranking/public/region?${qs.toString()}`
    }
    return null
  }, [regionId, scope, selectedMachine, selectedProfession])

  const requestKey = `${scope}:${rankingUrl ?? "none"}`
  const rows = useMemo(
    () => (rankingState.key === requestKey ? rankingState.rows : []),
    [rankingState, requestKey]
  )
  const error = rankingState.key === requestKey ? rankingState.error : null
  const loading = !!rankingUrl && rankingState.key !== requestKey

  // Social do ranking (likes/comentários sobre os perfis listados)
  const profileIds = useMemo(() => rows.map((row) => row.id_profile), [rows])
  const { summaryById, mergeSummary, toggleLike } = useRankingSocial(profileIds)
  const [socialTarget, setSocialTarget] = useState<RankingSocialTarget | null>(null)
  const openComments = (row: RankingRow, rank: number) => {
    setSocialTarget({
      id_profile: row.id_profile,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      username: row.username,
      href: rowHref(row),
      rank,
      points: Math.round(Number(row.ranking_score ?? row.total_points ?? 0)),
      is_clan: row.is_clan,
    })
  }

  const scopeLabel = useMemo(() => {
    if (scope === "general") return t("scopeBrasil", "Brasil")
    if (scope === "machine") return selectedMachine ? tx.enxame(selectedMachine.slug, selectedMachine.name) : t("scopeEnxame", "Enxame")
    if (scope === "profession") return selectedProfession ? tx.profession(selectedProfession.label) : t("scopeProfissao", "Profissão")
    if (regionName && regionState) return `${regionName}, ${regionState}`
    return t("scopeRegiao", "Região")
  }, [regionName, regionState, scope, selectedMachine, selectedProfession, t, tx])

  const rest = rows.slice(3)

  useEffect(() => {
    if (!rootRef.current) return
    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
      tl.from("[data-ranking-hero]", { y: 26, autoAlpha: 0, duration: 0.8, stagger: 0.08 })
        .from("[data-ranking-filter]", { y: 18, autoAlpha: 0, duration: 0.55 }, "-=0.35")
    }, rootRef)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!rankingUrl) return
    let cancelled = false
    fetch(rankingUrl, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => [])
        if (!response.ok) {
          const message =
            data && typeof data === "object" && "error" in data
              ? String((data as { error?: unknown }).error)
              : t("loadError", "Erro ao carregar ranking")
          throw new Error(message)
        }
        return normalizeRows(data)
      })
      .then((nextRows) => {
        if (!cancelled) setRankingState({ key: requestKey, rows: nextRows, error: null })
      })
      .catch((err) => {
        if (!cancelled) {
          setRankingState({
            key: requestKey,
            rows: [],
            error: err instanceof Error ? err.message : t("loadError", "Erro ao carregar ranking"),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [rankingUrl, requestKey, t])

  useEffect(() => {
    if (!listRef.current || loading || error) return
    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
      gsap.fromTo(
        "[data-ranking-row]",
        { x: -24, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.45, stagger: 0.07, ease: "power2.out" }
      )
    }, listRef)
    return () => ctx.revert()
  }, [error, loading, rankingState.key])

  return (
    <main ref={rootRef} className="fl-root fl-paper-texture relative min-h-screen overflow-x-clip pb-24">
      <Halftone className="absolute left-4 top-32 h-28 w-28 opacity-[0.12]" />

      {/* HERO */}
      <section className="relative mx-auto grid w-full max-w-6xl gap-8 px-5 pb-10 pt-10 md:grid-cols-12 md:px-8 md:pt-14">
        <div className="md:col-span-12">
          <div data-ranking-hero className="mb-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 bg-[#0B0B0D] px-3 py-1.5 text-[#F1EDE2]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#F2B705]" />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em]">{t("badgeRanking", "Ranking Freelandoo")}</span>
            </span>
            <span className="fl-marker text-2xl text-[#F2B705]">{t("updatesEvery2h", "atualiza a cada 2h")}</span>
          </div>

          <h1 className="relative">
            <span data-ranking-hero className="fl-display block text-[13vw] leading-[0.88] text-[#F1EDE2] sm:text-[9vw] lg:text-[5.5rem]">
              {t("heroLine1", "Os líderes")}
            </span>
            <span data-ranking-hero className="fl-display relative z-10 block text-[13vw] leading-[0.88] text-[#F2B705] sm:text-[9vw] lg:text-[5.5rem]">
              {t("heroLine2", "do momento.")}
              <Underline className="absolute -bottom-3 left-0 h-5 w-[58%] text-[#F2B705]" />
            </span>
            <Spark className="absolute -left-1 -top-5 h-9 w-9 text-[#F2B705] md:-left-7" />
          </h1>

          <p data-ranking-hero className="mt-7 max-w-xl text-pretty text-base font-medium leading-relaxed text-[#C9C2B6] md:text-lg">
            {t("heroParaPre", "Na Freelandoo, ")}<YellowHighlight mark>{t("heroParaHighlight", "aparecer é subir.")}</YellowHighlight>{t("heroParaPost", " Pontos, avaliações e presença definem quem domina o ranking. Inspire-se e suba mais.")}
          </p>
        </div>

      </section>

      {/* FILTROS */}
      <section data-ranking-filter className="mx-auto w-full max-w-6xl px-5 md:px-8">
        <div className="flex flex-col gap-3 border-y-2 border-[#F1EDE2]/12 py-5">
          <div className="flex flex-wrap gap-2">
            {scopeOptions.map(({ key, labelKey, label, icon: Icon }) => {
              const active = scope === key
              const hintId: HintId =
                key === "general"
                  ? "ranking-scope-general"
                  : key === "machine"
                    ? "ranking-scope-machine"
                    : key === "profession"
                      ? "ranking-scope-profession"
                      : "ranking-scope-region"
              return (
                <HoverHint key={key} id={hintId} side="bottom" dataTour={hintId}>
                  <button
                    type="button"
                    onClick={() => setScope(key)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 border-2 px-4 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-transform hover:-translate-y-0.5",
                      active
                        ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D]"
                        : "border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2] hover:border-[#F1EDE2]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {t(labelKey, label)}
                  </button>
                </HoverHint>
              )
            })}
          </div>

          {scope === "machine" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {rankedMachines.map((machine) => {
                const active = selectedMachine?.slug === machine.slug
                return (
                  <button
                    key={machine.id_machine}
                    type="button"
                    onClick={() => setMachineSlug(String(machine.slug))}
                    className={cn(
                      "h-9 shrink-0 border-2 px-3 text-[11px] font-extrabold uppercase tracking-[0.1em] transition",
                      active ? "border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D]" : "border-[#F1EDE2]/20 text-[#C9C2B6] hover:border-[#F1EDE2]/50"
                    )}
                  >
                    {tx.enxame(machine.slug, machine.name)}
                  </button>
                )
              })}
            </div>
          )}

          {scope === "profession" && (
            <div className="flex flex-col gap-2 sm:max-w-md">
              <Select value={selectedProfession?.slug} onValueChange={setProfessionSlug} disabled={!professions.length}>
                <SelectTrigger className="h-11 w-full border-2 border-[#F1EDE2]/25 bg-transparent text-[#F1EDE2]">
                  <SelectValue placeholder={t("professionPlaceholder", "Profissão")} />
                </SelectTrigger>
                <SelectContent className="border-[#F1EDE2]/15 bg-[#1D1810] text-[#F1EDE2]">
                  {professions.map((profession) => (
                    <SelectItem key={profession.slug} value={profession.slug}>
                      {tx.profession(profession.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProfession && <span className="text-xs text-[#C9C2B6]/70">{tx.enxame(null, selectedProfession.machineName)}</span>}
            </div>
          )}

          {scope === "region" && (
            <RegionFilterSheet
              state={regionState}
              regionId={regionId}
              regionName={regionName}
              accent={theme.accent}
              onChange={(next) => {
                setRegionState(next.state)
                setRegionId(next.regionId)
                setRegionName(next.regionName)
              }}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-11 w-fit items-center gap-2 border-2 border-[#F1EDE2]/25 px-4 text-sm font-extrabold uppercase tracking-[0.1em] text-[#F1EDE2] transition hover:border-[#F1EDE2]"
                >
                  <MapPin className="h-4 w-4 text-[#F2B705]" />
                  {regionName && regionState ? `${regionName}, ${regionState}` : t("regionPlaceholder", "Região")}
                </button>
              }
            />
          )}
        </div>
      </section>

      {/* PÓDIO */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-20 md:px-8 md:pt-24">
        <div className="relative mb-4 flex items-end justify-between">
          <div className="relative">
            <p className="fl-marker text-2xl text-[#F2B705]">{t("podiumEyebrow", "o topo da temporada")}</p>
            <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-5xl">{t("podiumHeading", "O pódio.")}</h2>
          </div>
          <span className="hidden text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C9C2B6]/50 sm:block">{t("top3", "Top 3")} · {scopeLabel}</span>
        </div>
        <RankingPodium
          rows={rows}
          rowHref={(row) => rowHref(row as RankingRow)}
          loading={loading}
          summaryFor={(row) => summaryById[row.id_profile] || emptySummary(row.id_profile)}
          onLike={(row) => toggleLike(row.id_profile)}
          onComments={(row, rank) => openComments(row as RankingRow, rank)}
        />
      </section>

      {/* LISTA */}
      <section ref={listRef} className="mx-auto w-full max-w-4xl px-5 py-14 md:px-8">
        <div className="mb-7 flex items-end justify-between">
          <div className="relative">
            <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-6xl">{t("listHeading", "A lista inteira")}</h2>
            <p className="mt-2 fl-marker text-2xl text-[#C9C2B6]/80">{scopeLabel}</p>
            <Underline className="absolute -bottom-3 left-0 h-4 w-44 text-[#F2B705]" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#C9C2B6]/50">{t("top10", "Top 10")}</span>
        </div>

        <div className="flex min-h-[300px] flex-col gap-4">
          {loading && <RankingSkeleton />}
          {!loading && error && <RankingError error={error} />}
          {!loading && !error && rows.length === 0 && <RankingEmpty />}
          {!loading && !error && rest.map((row, index) => (
            <RankingRowCard
              key={row.id_profile}
              row={row}
              rank={index + 4}
              summary={summaryById[row.id_profile] || emptySummary(row.id_profile)}
              onLike={() => toggleLike(row.id_profile)}
              onComments={() => openComments(row, index + 4)}
            />
          ))}
          {!loading && !error && rows.length > 0 && rest.length === 0 && (
            <p className="text-center text-sm text-[#C9C2B6]/60">{t("allShownOnPodium", "O pódio já mostra todos os colocados.")}</p>
          )}
        </div>
      </section>

      {socialTarget && (
        <RankingSocialPanel
          target={socialTarget}
          summary={summaryById[socialTarget.id_profile] || emptySummary(socialTarget.id_profile)}
          onClose={() => setSocialTarget(null)}
          onToggleLike={toggleLike}
          mergeSummary={mergeSummary}
        />
      )}
    </main>
  )
}

function RankingRowCard({
  row,
  rank,
  summary,
  onLike,
  onComments,
}: {
  row: RankingRow
  rank: number
  summary: RankingSocialSummary
  onLike: () => void
  onComments: () => void
}) {
  const t = useTranslations("Ranking")
  const initials = getInitials(row.display_name)
  const location = row.municipio && row.estado ? `${row.municipio}, ${row.estado}` : null
  const level = Number(row.level ?? row.xp_level ?? 0)
  const points = Number(row.ranking_score ?? row.total_points ?? 0)
  const meta = [row.specialty, row.machine_name, location].filter(Boolean).join(" · ") || t("metaFallback", "Perfil Freelandoo")

  return (
    <Link
      data-ranking-row
      href={rowHref(row)}
      className="group relative flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#F1EDE2] px-3 py-3 shadow-[5px_5px_0_0_#0B0B0D] transition-transform duration-200 hover:-translate-y-1 hover:-rotate-[0.4deg] hover:shadow-[8px_8px_0_0_#F2B705] md:gap-5 md:px-5 md:py-4"
    >
      <div className="flex w-9 shrink-0 justify-center md:w-12">
        <span className="fl-display text-3xl text-[#0B0B0D] md:text-4xl">{rank}</span>
      </div>

      <div className="relative shrink-0 rotate-[-2deg] overflow-hidden border-2 border-[#0B0B0D]" style={{ outline: "2px solid #F2B705", outlineOffset: "1px" }}>
        <Avatar className="h-12 w-12 rounded-none md:h-14 md:w-14">
          {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.display_name} className="object-cover" />}
          <AvatarFallback className="rounded-none bg-[#1D1810] text-xs font-bold text-[#F2B705]">{initials}</AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="fl-display truncate text-xl leading-none text-[#0B0B0D] md:text-2xl">{row.display_name}</h4>
          <span className={cn("hidden -rotate-1 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.12em] sm:inline-block", row.is_clan ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#0B0B0D] text-[#F1EDE2]")}>
            {row.is_clan ? t("badgeClan", "Clan") : t("badgePerfil", "Perfil")}
          </span>
          {level > 0 && (
            <span className="hidden border border-[#0B0B0D]/30 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-[#9a7400] md:inline-block">
              {t("levelPrefix", "Lv.")} {level}
            </span>
          )}
        </div>
        <p className="truncate text-[11px] font-semibold text-[#6B6457]">{meta}</p>
        <div className="mt-1.5 flex items-center gap-2 md:gap-4">
          <Stat className="hidden md:inline-flex" icon={<Star className="h-3.5 w-3.5 text-[#E0A500]" />} value={row.avg_rating ? Number(row.avg_rating).toFixed(1) : "0.0"} />
          <Stat className="hidden md:inline-flex" icon={<Eye className="h-3.5 w-3.5 text-[#6B6457]" />} value={<AnimatedNumber value={row.visits_count ?? 0} compact />} />
          <RankingSocialActions summary={summary} onLike={onLike} onComments={onComments} />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <div className="fl-display text-2xl leading-none text-[#E0A500] md:text-4xl">{numberFormatter.format(Math.round(points))}</div>
        <div className="mt-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#6B6457]">
          {t("pontos", "pontos")}
          <ArrowUpRight className="h-3.5 w-3.5 text-[#0B0B0D]/40 transition group-hover:text-[#E0A500]" />
        </div>
      </div>
    </Link>
  )
}

function Stat({ icon, value, className }: { icon: ReactNode; value: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 text-xs font-extrabold tabular-nums text-[#0B0B0D]", className)}>
      {icon}
      {value}
    </span>
  )
}

function RankingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="h-[76px] animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
      ))}
    </div>
  )
}

function RankingEmpty() {
  const t = useTranslations("Ranking")
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center border-2 border-dashed border-[#F1EDE2]/15 text-center">
      <div className="flex h-12 w-12 items-center justify-center bg-[#F2B705] text-[#0B0B0D]">
        <Trophy className="h-6 w-6" />
      </div>
      <p className="mt-4 fl-display text-2xl text-[#F1EDE2]">{t("emptyTitle", "Ninguém no ranking ainda.")}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#C9C2B6]/60">{t("emptyDesc", "Assim que houver dados suficientes, o top 10 aparece aqui.")}</p>
    </div>
  )
}

function RankingError({ error }: { error: string }) {
  const t = useTranslations("Ranking")
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center border-2 border-dashed border-red-400/30 text-center">
      <div className="flex h-12 w-12 items-center justify-center bg-red-500/15 text-red-300">
        <Loader2 className="h-5 w-5" />
      </div>
      <p className="mt-4 fl-display text-2xl text-[#F1EDE2]">{t("errorTitle", "Não deu pra carregar.")}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#C9C2B6]/60">{error}</p>
    </div>
  )
}
