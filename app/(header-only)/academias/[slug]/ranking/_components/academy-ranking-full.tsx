"use client"

// Página de ranking da academia — design de pódio editorial do /ranking (paleta
// Freelandoo dark, cards de papel off-white, torn photos, pedestais, coroa no
// #1). Métrica escolhível (frequência da catraca / posts / compartilhamento).

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Settings2, ShieldAlert } from "lucide-react"
import { DoodleCrown } from "@/components/home/landing/primitives"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

type RankMember = {
  id_member: string
  nome: string | null
  username: string | null
  avatar_url: string | null
  freq_days: number
  posts_count: number
  shares_count: number
}
type Season = { active: boolean; started_at: string; ends_at: string; days: number; days_left: number } | null
type Goals = { freq_target_month: number; posts_target_month: number; shares_target_month: number; season_days?: number }
type RankingData = { month: string | null; season: Season; goals: Goals; members: RankMember[] }
type Academy = { id_academy: string; nome: string; slug: string; avatar_url: string | null; is_owner?: boolean }
type Tab = "freq" | "posts" | "shares"

function initials(name: string | null | undefined) {
  if (!name) return "?"
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("")
}

export function AcademyRankingFull({ slug }: { slug: string }) {
  const t = useTranslations("Academies")
  const [academy, setAcademy] = useState<Academy | null>(null)
  const [data, setData] = useState<RankingData | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [tab, setTab] = useState<Tab>("freq")

  // Metas/temporada do dono: moravam no ranking resumido da pagina da academia
  // ate ele sair do corpo da pagina — agora e aqui que o dono edita.
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [gFreq, setGFreq] = useState("12")
  const [gPosts, setGPosts] = useState("4")
  const [gShares, setGShares] = useState("4")
  const [gDays, setGDays] = useState(30)
  const [savingGoals, setSavingGoals] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      // Com token pra saber se quem olha e o dono (e o que liga as metas).
      const ares = await fetch(`/api/academies/slug/${encodeURIComponent(slug)}`, { headers: authHeaders() })
      if (!ares.ok) throw new Error()
      const adata = await ares.json()
      const a: Academy = adata.academy
      setAcademy(a)
      const rres = await fetch(`/api/academies/${a.id_academy}/ranking`)
      if (!rres.ok) throw new Error()
      const d = (await rres.json()) as RankingData
      setData(d)
      setGFreq(String(d.goals.freq_target_month))
      setGPosts(String(d.goals.posts_target_month))
      setGShares(String(d.goals.shares_target_month))
      setGDays(Number(d.goals.season_days) || 30)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [slug, authHeaders])

  useEffect(() => {
    void load()
  }, [load])

  const saveGoals = useCallback(
    async (extra?: { start_season?: boolean; end_season?: boolean }) => {
      if (!academy) return
      setSavingGoals(true)
      try {
        const res = await fetch(`/api/academies/${academy.id_academy}/goals`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            freq_target_month: Number(gFreq),
            posts_target_month: Number(gPosts),
            shares_target_month: Number(gShares),
            season_days: gDays,
            ...(extra || {}),
          }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error)
        toast.success(
          extra?.start_season
            ? t("seasonStarted", "Temporada iniciada!")
            : extra?.end_season
              ? t("seasonEnded", "Temporada encerrada.")
              : t("goalsSaved", "Metas da academia atualizadas!")
        )
        setGoalsOpen(false)
        void load()
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("goalsError", "Erro ao salvar metas"))
      } finally {
        setSavingGoals(false)
      }
    },
    [academy, gFreq, gPosts, gShares, gDays, authHeaders, load, t]
  )

  const value = useCallback(
    (m: RankMember): number => (tab === "freq" ? m.freq_days : tab === "posts" ? m.posts_count : m.shares_count),
    [tab]
  )
  const target = data
    ? tab === "freq"
      ? data.goals.freq_target_month
      : tab === "posts"
        ? data.goals.posts_target_month
        : data.goals.shares_target_month
    : 0

  const sorted = data ? [...data.members].sort((a, b) => value(b) - value(a)) : []
  const season = data?.season || null

  if (state === "loading") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
      </div>
    )
  }
  if (state === "error" || !academy || !data) {
    return (
      <div className="fl-sharp flex min-h-[100dvh] items-center justify-center bg-[#0b0804] px-4 text-center text-[#F5F1E8]">
        <div>
          <ShieldAlert className="mx-auto h-10 w-10 text-[#9A938A]" />
          <p className="mt-4 text-sm text-[#9A938A]">{t("rankingError", "Erro ao carregar o ranking.")}</p>
          <Link href={`/academias/${slug}`} className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F2B705]">
            <ArrowLeft className="h-4 w-4" /> {academy?.nome || t("backToAcademy", "Voltar")}
          </Link>
        </div>
      </div>
    )
  }

  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  return (
    <div className="fl-root min-h-[100dvh] bg-[#0b0804] pb-24 text-[#F1EDE2]">
      <div className="mx-auto max-w-4xl px-4 pt-6 md:px-6">
        {/* Voltar + nome */}
        <Link href={`/academias/${slug}`} className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#9A938A] hover:text-[#F2B705]">
          <ArrowLeft className="h-3.5 w-3.5" /> {academy.nome}
        </Link>

        {/* Métrica */}
        <div className="mt-5 flex flex-wrap items-center gap-1">
          {(
            [
              ["freq", "rankTabFreq", "Frequência"],
              ["posts", "rankTabPosts", "Posts"],
              ["shares", "rankTabShares", "Compartilhamento"],
            ] as const
          ).map(([id, key, fallback]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "border-2 border-[#0B0B0D] px-3 py-1 text-[11px] font-extrabold uppercase",
                tab === id ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"
              )}
            >
              {t(key, fallback)}
            </button>
          ))}
          {academy.is_owner && (
            <button
              onClick={() => setGoalsOpen(true)}
              title={t("goalsCta", "Metas")}
              aria-label={t("goalsCta", "Metas")}
              className="ml-1 flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[11px] font-extrabold uppercase text-[#F2B705]"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t("goalsCta", "Metas")}
            </button>
          )}
        </div>

        {/* Cabeçalho pódio */}
        <div className="mt-8 text-center">
          <p className="fl-marker text-2xl text-[#F2B705]">
            {season?.active
              ? `${t("seasonActiveLabel", "Temporada ativa")} · ${season.days_left} ${t("daysLeft", "dias restantes")}`
              : t("podiumEyebrow", "o topo do mês")}
          </p>
          <h1 className="fl-display text-4xl text-[#F1EDE2] md:text-6xl">{t("podiumHeading", "O pódio.")}</h1>
        </div>

        {/* PÓDIO top 3 */}
        {top3.length === 0 ? (
          <p className="mt-10 text-center text-sm text-[#9A938A]">{t("rankingEmpty", "Sem membros no ranking ainda.")}</p>
        ) : (
          <div className="mt-8 flex items-end justify-center gap-1.5 sm:gap-3 md:gap-5">
            {top3.map((row, i) => (
              <PodiumCol key={row.id_member} row={row} rank={(i + 1) as 1 | 2 | 3} value={value(row)} target={target} unit={tab} t={t} />
            ))}
          </div>
        )}

        {/* A LISTA INTEIRA */}
        {rest.length > 0 && (
          <div className="mt-16">
            <h2 className="fl-display text-4xl text-[#F1EDE2] md:text-6xl">{t("listHeading", "A lista inteira")}</h2>
            <ol className="mt-6 space-y-2">
              {rest.map((m, i) => {
                const v = value(m)
                const pct = target > 0 ? Math.min(100, Math.round((v / target) * 100)) : 0
                return (
                  <li key={m.id_member} className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] p-3">
                    <span className="w-8 shrink-0 fl-display text-2xl leading-none text-[#F1EDE2]/40">{i + 4}</span>
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" loading="lazy" className="h-10 w-10 shrink-0 border-2 border-[#0B0B0D] object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-[#0B0B0D] bg-[#1D1810] fl-display text-sm text-[#F2B705]">
                        {initials(m.nome || m.username)}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-[#F1EDE2]">{m.nome || m.username || "—"}</span>
                    <div className="hidden h-2 w-32 border-2 border-[#0B0B0D] bg-[#1D1810] sm:block">
                      <div className="h-full bg-[#F2B705]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 shrink-0 text-right fl-display text-xl text-[#E0A500]">
                      {v}
                      <span className="text-[10px] font-bold text-[#6B6457]">/{target}</span>
                    </span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>

      {/* Modal metas (dono) */}
      {goalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setGoalsOpen(false)}>
          <div className="fl-sharp w-full max-w-sm border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8]" style={{ boxShadow: "8px 8px 0 0 #F2B705" }} onClick={(e) => e.stopPropagation()}>
            <h3 className="border-b-2 border-[#0B0B0D] pb-2 text-lg font-black uppercase">{t("goalsModalTitle", "Metas mensais")}</h3>
            <label className="mt-4 block">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("goalFreqLabel", "Frequência (dias no mês)")}</span>
              <input value={gFreq} onChange={(e) => setGFreq(e.target.value)} inputMode="numeric" className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F5F1E8] outline-none" />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("goalPostsLabel", "Posts no mês")}</span>
              <input value={gPosts} onChange={(e) => setGPosts(e.target.value)} inputMode="numeric" className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F5F1E8] outline-none" />
            </label>
            <label className="mt-3 block">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A938A]">{t("goalSharesLabel", "Compartilhamentos no mês")}</span>
              <input value={gShares} onChange={(e) => setGShares(e.target.value)} inputMode="numeric" className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F5F1E8] outline-none" />
            </label>

            {/* Temporada: janela fixa de 30/60/90 dias (mig 182) */}
            <div className="mt-4 border-t-2 border-[#0B0B0D] pt-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F2B705]">{t("seasonTitle", "Temporada")}</p>
              <p className="mt-1 text-[11px] text-[#9A938A]">
                {t("seasonHint", "Vale as metas por uma janela fixa a partir de hoje (como nas comunidades). Sem temporada, o ranking usa o mês.")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={gDays}
                  onChange={(e) => setGDays(Number(e.target.value))}
                  className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-xs font-bold uppercase text-[#F5F1E8] outline-none [&_option]:bg-[#15120E]"
                >
                  <option value={30}>{t("goalDays30", "30 dias")}</option>
                  <option value={60}>{t("goalDays60", "60 dias")}</option>
                  <option value={90}>{t("goalDays90", "90 dias")}</option>
                </select>
                <button
                  onClick={() => void saveGoals({ start_season: true })}
                  disabled={savingGoals}
                  className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase text-[#0B0B0D] disabled:opacity-50"
                >
                  {savingGoals ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {season?.active ? t("seasonRestart", "Reiniciar temporada") : t("seasonStart", "Iniciar temporada")}
                </button>
                {season?.active && (
                  <button
                    onClick={() => void saveGoals({ end_season: true })}
                    disabled={savingGoals}
                    className="border-2 border-[#ff5a44]/60 px-3 py-1.5 text-[11px] font-extrabold uppercase text-[#ff7a6a] disabled:opacity-50"
                  >
                    {t("seasonEnd", "Encerrar")}
                  </button>
                )}
              </div>
              {season?.active && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                  {t("seasonActiveLabel", "Temporada ativa")} · {season.days_left} {t("daysLeft", "dias restantes")}
                </p>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-3">
              <button onClick={() => setGoalsOpen(false)} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-xs font-extrabold uppercase text-[#F5F1E8] hover:bg-[#241d12]">
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={() => void saveGoals()}
                disabled={savingGoals}
                className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase text-[#0B0B0D] disabled:opacity-50"
              >
                {savingGoals && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("goalsSubmit", "Salvar metas")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PodiumCol({
  row,
  rank,
  value,
  target,
  unit,
  t,
}: {
  row: RankMember
  rank: 1 | 2 | 3
  value: number
  target: number
  unit: Tab
  t: (k: string, f: string) => string
}) {
  const isFirst = rank === 1
  const order = rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3"
  const width = isFirst ? "w-[40%]" : "w-[30%]"
  const pedestalH = isFirst ? "h-14 md:h-36" : rank === 2 ? "h-10 md:h-24" : "h-8 md:h-16"
  const frame = isFirst ? "#F2B705" : "#0B0B0D"
  const unitWord =
    unit === "freq" ? t("daysWord", "dias") : unit === "posts" ? t("rankTabPosts", "Posts") : t("rankTabShares", "Compart.")

  return (
    <div className={cn("flex min-w-0 flex-col items-center", order, width)}>
      <div className="relative w-full">
        {isFirst && (
          <>
            <div className="absolute -inset-6 -z-10 rounded-full blur-3xl" style={{ background: "#F2B705", opacity: 0.25 }} />
            <DoodleCrown className="absolute -top-7 left-1/2 z-20 h-8 w-12 -translate-x-1/2 text-[#F2B705] md:-top-11 md:h-11 md:w-16" />
          </>
        )}
        <span
          className={cn(
            "absolute -left-1.5 -top-1.5 z-20 flex h-6 w-6 rotate-[-6deg] items-center justify-center fl-display text-base md:h-12 md:w-12 md:text-3xl",
            isFirst ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#0B0B0D] text-[#F1EDE2]"
          )}
        >
          {rank}
        </span>

        {/* Foto do perfil (1º perfil) em card rasgado — fallback: iniciais */}
        <div className="fl-torn-1 fl-cut relative overflow-hidden p-2" style={{ background: frame }}>
          {row.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.avatar_url}
              alt={row.nome || row.username || ""}
              loading="lazy"
              className={cn("w-full object-cover", isFirst ? "aspect-[4/5]" : "aspect-square")}
            />
          ) : (
            <div className={cn("flex w-full items-center justify-center bg-[#1D1810] fl-display text-[#F2B705]", isFirst ? "aspect-[4/5] text-6xl" : "aspect-square text-5xl")}>
              {initials(row.nome || row.username)}
            </div>
          )}
        </div>

        {/* Nome + valor */}
        <div className="fl-card relative mt-2 p-2 text-center md:mt-3 md:p-3">
          <span className="inline-block -rotate-1 bg-[#0B0B0D] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#F1EDE2]">
            {t("badgeMember", "Membro")}
          </span>
          <h3 className={cn("fl-display mt-1.5 leading-none text-[#0B0B0D] md:mt-2", isFirst ? "text-sm md:text-4xl" : "text-xs md:text-3xl")}>
            {row.nome || row.username || "—"}
          </h3>
          <div className="mt-1.5 fl-display leading-none text-[#E0A500] md:mt-2">
            <span className={isFirst ? "text-xl md:text-5xl" : "text-lg md:text-4xl"}>{value}</span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#6B6457] md:text-[10px]">
            {unitWord} · {t("goalWord", "meta")} {target}
          </p>
        </div>
      </div>

      {/* Pedestal */}
      <div className={cn("relative mt-3 flex w-[78%] items-center justify-center md:w-full", pedestalH)}>
        <div className={cn("absolute inset-0", isFirst ? "bg-[#F2B705]" : "bg-[#0B0B0D]")} style={{ clipPath: "polygon(6% 0, 94% 0, 100% 100%, 0 100%)" }} />
        <span className={cn("fl-display relative z-10 text-2xl md:text-7xl", isFirst ? "text-[#0B0B0D]/85" : "text-[#F1EDE2]/85")}>{rank}</span>
      </div>
    </div>
  )
}
