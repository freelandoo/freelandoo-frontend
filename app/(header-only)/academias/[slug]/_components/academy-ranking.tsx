"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2, Medal, Settings2, Trophy } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

type RankMember = {
  id_member: string
  nome: string | null
  username: string | null
  freq_days: number
  posts_count: number
  shares_count: number
}

type Season = { active: boolean; started_at: string; ends_at: string; days: number; days_left: number } | null

type Goals = {
  freq_target_month: number
  posts_target_month: number
  shares_target_month: number
  season_days: number
  season?: Season
}

type RankingData = { month: string | null; season: Season; goals: Goals; members: RankMember[] }

type Tab = "freq" | "posts" | "shares"

/** Ranking mensal da academia (frequência pela catraca / posts / shares). */
export function AcademyRanking({ academyId, isOwner }: { academyId: string; isOwner: boolean }) {
  const t = useTranslations("Academies")

  const [data, setData] = useState<RankingData | null>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [tab, setTab] = useState<Tab>("freq")

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
      const res = await fetch(`/api/academies/${academyId}/ranking`)
      if (!res.ok) throw new Error()
      const d = (await res.json()) as RankingData
      setData(d)
      setGFreq(String(d.goals.freq_target_month))
      setGPosts(String(d.goals.posts_target_month))
      setGShares(String(d.goals.shares_target_month))
      setGDays(Number(d.goals.season_days) || 30)
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [academyId])

  useEffect(() => {
    void load()
  }, [load])

  const saveGoals = useCallback(
    async (extra?: { start_season?: boolean; end_season?: boolean }) => {
      setSavingGoals(true)
      try {
        const res = await fetch(`/api/academies/${academyId}/goals`, {
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
    [academyId, gFreq, gPosts, gShares, gDays, authHeaders, load, t]
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

  return (
    <section className="mt-6 border-2 border-[#0B0B0D] bg-[#15120E] p-4 text-[#F5F1E8]">
      <div className="flex items-center justify-between border-b-2 border-[#0B0B0D] pb-2">
        <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em]">
          <Trophy className="h-4 w-4 text-[#F2B705]" />
          {season?.active ? t("rankingSeasonTitle", "Ranking da temporada") : t("rankingTitle", "Ranking do mês")}
          {season?.active ? (
            <span className="text-[10px] text-[#F2B705]">
              ({season.days_left} {t("daysLeft", "dias restantes")})
            </span>
          ) : (
            data?.month && <span className="text-[10px] text-[#9A938A]">({data.month})</span>
          )}
        </h2>
        {isOwner && (
          <button onClick={() => setGoalsOpen(true)} className="flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1 text-[10px] font-extrabold uppercase text-[#F5F1E8] hover:bg-[#241d12]">
            <Settings2 className="h-3 w-3" />
            {t("goalsCta", "Metas")}
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-1">
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
            className={`border-2 border-[#0B0B0D] px-3 py-1 text-[11px] font-extrabold uppercase ${tab === id ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"}`}
          >
            {t(key, fallback)}
          </button>
        ))}
      </div>

      {state === "loading" && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" />
        </div>
      )}
      {state === "error" && <p className="mt-3 text-xs text-[#9A938A]">{t("rankingError", "Erro ao carregar o ranking.")}</p>}
      {state === "loaded" && sorted.length === 0 && (
        <p className="mt-3 text-xs text-[#9A938A]">{t("rankingEmpty", "Sem membros no ranking ainda.")}</p>
      )}

      {sorted.length > 0 && (
        <ol className="mt-3 space-y-1">
          {sorted.slice(0, 20).map((m, i) => {
            const v = value(m)
            const pct = target > 0 ? Math.min(100, Math.round((v / target) * 100)) : 0
            return (
              <li key={m.id_member} className="flex items-center gap-3 border-b border-[#F5F1E8]/10 py-1.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center border-2 border-[#0B0B0D] text-xs font-black ${i === 0 ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"}`}>
                  {i < 3 ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{m.nome || m.username || "—"}</span>
                <div className="hidden h-2 w-28 border-2 border-[#0B0B0D] bg-[#1D1810] sm:block">
                  <div className="h-full bg-[#F2B705]" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-16 text-right text-sm font-black">
                  {v}
                  <span className="text-[10px] font-bold text-[#9A938A]">/{target}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}

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
    </section>
  )
}
