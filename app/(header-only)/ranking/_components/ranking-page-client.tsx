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
  Heart,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { CityFilterSheet } from "@/components/feed/city-filter-sheet"
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
import { buildProfileUrl, slugify } from "@/lib/slug"
import { cn } from "@/lib/utils"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"
import { RankingPodium } from "./ranking-podium"

type RankingScope = "general" | "machine" | "profession" | "city"

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
  label: string
  icon: ComponentType<{ className?: string }>
}[] = [
  { key: "general", label: "Geral", icon: Globe2 },
  { key: "machine", label: "Enxame", icon: Building2 },
  { key: "profession", label: "Profissão", icon: Briefcase },
  { key: "city", label: "Cidade", icon: MapPin },
]

const numberFormatter = new Intl.NumberFormat("pt-BR")
const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
})

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

function rankClass(rank: number) {
  if (rank === 1) return "bg-primary text-primary-foreground shadow-[0_0_24px_-8px_rgba(230,184,0,0.75)]"
  if (rank === 2) return "bg-zinc-200 text-zinc-950"
  if (rank === 3) return "bg-amber-700 text-white"
  return "bg-white/[0.07] text-white/[0.65]"
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
  const [cityState, setCityState] = useState<string | null>("SP")
  const [city, setCity] = useState<string | null>("São Paulo")
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
    if (scope === "city" && city && cityState) {
      const qs = new URLSearchParams({
        municipio: city,
        estado: cityState,
        limit: "10",
      })
      return `/api/ranking/public/city?${qs.toString()}`
    }
    return null
  }, [city, cityState, scope, selectedMachine, selectedProfession])

  const requestKey = `${scope}:${rankingUrl ?? "none"}`
  const rows = rankingState.key === requestKey ? rankingState.rows : []
  const error = rankingState.key === requestKey ? rankingState.error : null
  const loading = !!rankingUrl && rankingState.key !== requestKey

  const scopeLabel = useMemo(() => {
    if (scope === "general") return "Brasil"
    if (scope === "machine") return selectedMachine?.name || "Enxame"
    if (scope === "profession") return selectedProfession?.label || "Profissão"
    if (city && cityState) return `${city}, ${cityState}`
    return "Cidade"
  }, [city, cityState, scope, selectedMachine, selectedProfession])

  useEffect(() => {
    if (!rootRef.current) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
      tl.from("[data-ranking-hero]", {
        y: 26,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.08,
      })
        .from(
          "[data-ranking-filter]",
          { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.05 },
          "-=0.35"
        )
        .from(
          "[data-ranking-summary]",
          { y: 18, autoAlpha: 0, duration: 0.55, stagger: 0.08 },
          "-=0.25"
        )
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
              : "Erro ao carregar ranking"
          throw new Error(message)
        }
        return normalizeRows(data)
      })
      .then((nextRows) => {
        if (!cancelled) {
          setRankingState({ key: requestKey, rows: nextRows, error: null })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRankingState({
            key: requestKey,
            rows: [],
            error: err instanceof Error ? err.message : "Erro ao carregar ranking",
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [rankingUrl, requestKey])

  useEffect(() => {
    if (!listRef.current || loading || error) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-ranking-row]",
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.45, stagger: 0.045, ease: "power2.out" }
      )
    }, listRef)
    return () => ctx.revert()
  }, [error, loading, rankingState.key])

  return (
    <main
      ref={rootRef}
      className="min-h-screen overflow-hidden bg-[#030406] pb-24 text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.065]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.55) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(230,184,0,0.12), rgba(3,4,6,0))",
        }}
      />

      <section className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pt-12 md:px-6 md:pt-16">
        <div className="max-w-2xl">
          <p
            data-ranking-hero
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.26em] text-primary/80"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ranking Freelandoo
          </p>
          <h1
            data-ranking-hero
            className="mt-4 text-3xl font-semibold leading-tight text-white md:text-5xl"
          >
            Os líderes do momento.
          </h1>
          <p
            data-ranking-hero
            className="mt-3 max-w-xl text-sm leading-6 text-white/[0.58] md:text-base"
          >
            Confira quem está dominando o ranking e inspire-se para subir
            ainda mais.
          </p>
          <p
            data-ranking-hero
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.5]"
          >
            <RefreshCw className="h-3.5 w-3.5 text-primary/80" />
            Atualização automática a cada 2 horas
          </p>
        </div>

        <div
          data-ranking-filter
          className="mt-8 flex flex-col gap-3 border-y border-white/10 py-4"
        >
          <div className="flex flex-wrap gap-2">
            {scopeOptions.map(({ key, label, icon: Icon }) => {
              const active = scope === key
              const hintId: HintId =
                key === "general"
                  ? "ranking-scope-general"
                  : key === "machine"
                    ? "ranking-scope-machine"
                    : key === "profession"
                      ? "ranking-scope-profession"
                      : "ranking-scope-city"
              return (
                <HoverHint key={key} id={hintId} side="bottom">
                  <button
                    type="button"
                    onClick={() => setScope(key)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-[0_0_28px_-14px_rgba(230,184,0,0.85)]"
                        : "border-white/10 bg-white/[0.03] text-white/[0.58] hover:border-white/[0.22] hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                </HoverHint>
              )
            })}
          </div>

          {scope === "machine" && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {rankedMachines.map((machine) => {
                const active = selectedMachine?.slug === machine.slug
                const machineTheme = activeMachineTheme(machine)
                return (
                  <button
                    key={machine.id_machine}
                    type="button"
                    onClick={() => setMachineSlug(String(machine.slug))}
                    className="h-9 shrink-0 rounded-full border px-3 text-xs font-semibold uppercase transition"
                    style={{
                      borderColor: active ? machineTheme.ring : "rgba(255,255,255,0.1)",
                      backgroundColor: active ? `${machineTheme.accent}22` : "rgba(255,255,255,0.03)",
                      color: active ? machineTheme.accent : "rgba(255,255,255,0.58)",
                      boxShadow: active ? `0 0 26px -14px ${machineTheme.glow}` : "none",
                    }}
                  >
                    {machine.name.replace("Enxame de ", "").replace("Enxame de ", "")}
                  </button>
                )
              })}
            </div>
          )}

          {scope === "profession" && (
            <div className="flex flex-col gap-2 sm:max-w-md">
              <Select
                value={selectedProfession?.slug}
                onValueChange={setProfessionSlug}
                disabled={!professions.length}
              >
                <SelectTrigger className="h-11 w-full border-white/10 bg-white/[0.04] text-white">
                  <SelectValue placeholder="Profissão" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950 text-white">
                  {professions.map((profession) => (
                    <SelectItem key={profession.slug} value={profession.slug}>
                      {profession.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProfession && (
                <span className="text-xs text-white/[0.45]">
                  {selectedProfession.machineName}
                </span>
              )}
            </div>
          )}

          {scope === "city" && (
            <CityFilterSheet
              state={cityState}
              city={city}
              accent={theme.accent}
              onChange={(next) => {
                setCityState(next.state)
                setCity(next.city)
              }}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-11 w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-white/[0.22]"
                >
                  <MapPin className="h-4 w-4 text-primary" />
                  {city && cityState ? `${city}, ${cityState}` : "Cidade"}
                </button>
              }
            />
          )}
        </div>

        <div className="mt-10 px-1 md:px-4">
          <RankingPodium
            rows={rows}
            rowHref={(row) => rowHref(row as RankingRow)}
            loading={loading}
          />
        </div>

        <section className="mt-8">
          <div
            ref={listRef}
            className="border border-white/10 bg-white/[0.025] p-2 shadow-[0_24px_70px_-46px_rgba(0,0,0,0.95)] backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-white/[0.35]">
                  Top 10
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  {scopeLabel}
                </h2>
              </div>
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  borderColor: theme.ring,
                  color: scope === "machine" ? theme.accent : "#e6b800",
                }}
              >
                {scopeOptions.find((option) => option.key === scope)?.label}
              </span>
              <span className="text-xs text-white/[0.38]">
                Atualização automática a cada 2 horas
              </span>
            </div>

            <div className="min-h-[470px] p-2">
              {loading && <RankingSkeleton />}
              {!loading && error && <RankingError error={error} />}
              {!loading && !error && rows.length === 0 && <RankingEmpty />}
              {!loading &&
                !error &&
                rows.map((row, index) => (
                  <RankingRowCard key={row.id_profile} row={row} rank={index + 1} />
                ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

function RankingRowCard({ row, rank }: { row: RankingRow; rank: number }) {
  const initials = getInitials(row.display_name)
  const location =
    row.municipio && row.estado ? `${row.municipio}, ${row.estado}` : null
  const level = Number(row.level ?? row.xp_level ?? 0)
  const xpTotal = Number(row.xp_total ?? 0)
  const progress = Math.min(100, Math.max(0, Number(row.xp_progress_percent ?? 0)))
  const points = Number(row.ranking_score ?? row.total_points ?? 0)

  return (
    <Link
      data-ranking-row
      href={rowHref(row)}
      className="group mb-2 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 border border-white/10 bg-black/20 px-3 py-3 opacity-0 transition hover:border-primary/[0.45] hover:bg-white/[0.045] sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]"
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full text-sm font-black",
          rankClass(rank)
        )}
      >
        #{rank}
      </span>
      <Avatar className="h-11 w-11 ring-1 ring-white/[0.12]">
        {row.avatar_url && <AvatarImage src={row.avatar_url} alt={row.display_name} />}
        <AvatarFallback className="bg-white/[0.06] text-xs font-semibold text-white/75">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold text-white md:text-base">
            {row.display_name}
          </span>
          {row.is_clan && (
            <span className="shrink-0 rounded-full border border-primary/25 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
              Clan
            </span>
          )}
          {!row.is_clan && (
            <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-white/[0.45]">
              Perfil
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-xs text-white/[0.45]">
          {[row.specialty, row.machine_name, location].filter(Boolean).join(" · ") ||
            "Perfil Freelandoo"}
        </span>
        <span className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
          <XpBadge level={level} xpTotal={xpTotal} progress={progress} />
          <span className="text-xs font-semibold text-primary">
            {numberFormatter.format(Math.round(points))} pts
          </span>
        </span>
      </span>
      <span className="hidden items-center gap-5 text-xs text-white/[0.55] sm:flex">
        <span className="flex min-w-[138px] flex-col items-end gap-1">
          <span className="font-semibold text-primary">
            {numberFormatter.format(Math.round(points))} pts
          </span>
          <XpBadge level={level} xpTotal={xpTotal} progress={progress} align="end" />
        </span>
        <span className="hidden items-center gap-4 md:flex">
        <Metric icon={<Star className="h-3.5 w-3.5 text-primary" />} value={row.avg_rating ? Number(row.avg_rating).toFixed(1) : "0.0"} />
        <Metric icon={<Eye className="h-3.5 w-3.5" />} value={compactFormatter.format(row.visits_count ?? 0)} />
        <Metric icon={<Heart className="h-3.5 w-3.5" />} value={compactFormatter.format(row.likes_count ?? 0)} />
        </span>
        <ArrowUpRight className="h-4 w-4 text-white/30 transition group-hover:text-primary" />
      </span>
    </Link>
  )
}

function XpBadge({
  level,
  xpTotal,
  progress,
  align = "start",
}: {
  level: number
  xpTotal: number
  progress: number
  align?: "start" | "end"
}) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-1", align === "end" && "items-end")}>
      <span className="inline-flex items-center gap-2">
        <span className="rounded-full border border-primary/30 bg-primary/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
          Lv. {level}
        </span>
        <span className="text-[11px] font-medium text-white/[0.58]">
          {numberFormatter.format(Math.round(xpTotal))} XP
        </span>
      </span>
      {progress > 0 && (
        <span className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.08]">
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </span>
      )}
    </span>
  )
}

function Metric({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      {value}
    </span>
  )
}

function RankingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className="h-[70px] animate-pulse border border-white/[0.08] bg-white/[0.035]"
        />
      ))}
    </div>
  )
}

function RankingEmpty() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.06] text-primary">
        <Trophy className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">
        Nenhum perfil no ranking ainda.
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-white/[0.45]">
        Assim que houver dados suficientes, o top 10 aparece aqui.
      </p>
    </div>
  )
}

function RankingError({ error }: { error: string }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/10 text-red-300">
        <Loader2 className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-semibold text-white">
        Não foi possível carregar o ranking.
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-white/[0.45]">{error}</p>
    </div>
  )
}
