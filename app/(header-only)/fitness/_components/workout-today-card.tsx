"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckSquare, Dumbbell, Loader2, Maximize2, Square, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

type PlanExercise = {
  id_plan_exercise: string
  exercise_nome: string
  muscle_group: string | null
  sets: number
  reps: string
  load_kg: number | null
  rest_seconds: number | null
  checked: boolean
}

type Plan = {
  id_plan: string
  nome: string
  days_on_plan: number
  completed_at: string | null
  exercises: PlanExercise[]
}

const MUSCLE_LABEL: Record<string, [string, string]> = {
  peito: ["musclePeito", "Peito"],
  costas: ["muscleCostas", "Costas"],
  ombros: ["muscleOmbros", "Ombros"],
  biceps: ["muscleBiceps", "Bíceps"],
  triceps: ["muscleTriceps", "Tríceps"],
  pernas: ["musclePernas", "Pernas"],
  gluteos: ["muscleGluteos", "Glúteos"],
  abdomen: ["muscleAbdomen", "Abdômen"],
  cardio: ["muscleCardio", "Cardio"],
  corpo_inteiro: ["muscleCorpo", "Corpo inteiro"],
}

/** Card "Treino de hoje" do painel /fitness (dados da fase 3 — fichas).
 *  Clicar na ficha abre um modal grande pra ler e marcar os checks. */
export function WorkoutTodayCard({ date, refreshKey = 0 }: { date: string; refreshKey?: number }) {
  const t = useTranslations("Workouts")
  const [plans, setPlans] = useState<Plan[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workouts/today?date=${date}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPlans(Array.isArray(data.plans) ? data.plans : [])
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [date, authHeaders])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded])

  const toggle = useCallback(
    async (plan: Plan, ex: PlanExercise) => {
      // otimista
      setPlans((prev) =>
        prev.map((p) =>
          p.id_plan === plan.id_plan
            ? { ...p, exercises: p.exercises.map((e) => (e.id_plan_exercise === ex.id_plan_exercise ? { ...e, checked: !e.checked } : e)) }
            : p
        )
      )
      try {
        const res = await fetch("/api/workouts/checks/toggle", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ id_plan: plan.id_plan, id_plan_exercise: ex.id_plan_exercise, log_date: date }),
        })
        if (!res.ok) throw new Error()
        void load()
      } catch {
        void load()
      }
    },
    [authHeaders, date, load]
  )

  const plan = plans[active]
  const doneCount = plan ? plan.exercises.filter((e) => e.checked).length : 0
  const totalCount = plan ? plan.exercises.length : 0

  return (
    <div className="border-2 border-[#0B0B0D] bg-[#15120E] p-4 text-[#F5F1E8]">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
        <Dumbbell className="h-4 w-4 text-[#F2B705]" /> {t("todayTitle", "Treino de hoje")}
      </p>

      {state === "loading" && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-[#9A938A]" />
        </div>
      )}

      {state !== "loading" && (!plan || plans.length === 0) && (
        <p className="mt-2 text-xs text-[#9A938A]">
          {t("todayEmpty", "Nenhuma ficha ativa. Seu professor pode montar seu treino na academia.")}
        </p>
      )}

      {plan && (
        <div className="mt-2">
          {plans.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {plans.map((p, i) => (
                <button
                  key={p.id_plan}
                  onClick={() => setActive(i)}
                  className={`border-2 border-[#0B0B0D] px-2 py-0.5 text-[10px] font-extrabold uppercase ${i === active ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"}`}
                >
                  {p.nome}
                </button>
              ))}
            </div>
          )}
          {/* Preview clicável — os checks vivem no modal grande */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={t("openPlanModal", "Abrir ficha em tela cheia")}
            className="mt-1 block w-full text-left hover:bg-[#1D1810]"
          >
            <p className="flex items-center gap-1.5 text-sm font-black">
              {plan.nome}
              <Maximize2 className="h-3.5 w-3.5 shrink-0 text-[#F2B705]" />
            </p>
            <p className="text-[10px] font-bold uppercase text-[#9A938A]">
              {t("daysOnPlan", "{n} dias com esta ficha").replace("{n}", String(plan.days_on_plan))}
            </p>
            {plan.completed_at && (
              <p className="mt-1 border-2 border-[#0B0B0D] bg-[#4fc95a] px-2 py-0.5 text-center text-[10px] font-extrabold uppercase text-[#0B0B0D]">
                {t("sessionDone", "Treino concluído!")}
              </p>
            )}
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
              {plan.exercises.map((ex) => (
                <li key={ex.id_plan_exercise} className="flex items-center gap-2 text-xs">
                  {ex.checked ? <CheckSquare className="h-4 w-4 shrink-0 text-[#4fc95a]" /> : <Square className="h-4 w-4 shrink-0 text-[#9A938A]" />}
                  <span className={`min-w-0 flex-1 truncate ${ex.checked ? "line-through text-[#9A938A]" : ""}`}>{ex.exercise_nome}</span>
                  <span className="shrink-0 font-bold text-[#9A938A]">
                    {ex.sets}×{ex.reps}
                    {ex.load_kg ? ` · ${ex.load_kg}kg` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </button>
        </div>
      )}

      {/* Modal grande da ficha — leitura confortável + checks */}
      {expanded && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setExpanded(false)}>
          <div
            className="fl-sharp flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] text-[#F5F1E8]"
            style={{ boxShadow: "8px 8px 0 0 #F2B705" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-[#0B0B0D] p-5 pb-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                  <Dumbbell className="h-4 w-4 text-[#F2B705]" /> {t("todayTitle", "Treino de hoje")}
                </p>
                <h3 className="mt-1 text-2xl font-black uppercase leading-tight">{plan.nome}</h3>
                <p className="text-[11px] font-bold uppercase text-[#9A938A]">
                  {t("daysOnPlan", "{n} dias com esta ficha").replace("{n}", String(plan.days_on_plan))}
                </p>
              </div>
              <button onClick={() => setExpanded(false)} aria-label={t("close", "Fechar")} className="shrink-0 p-1">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-5 pt-4">
              {plans.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {plans.map((p, i) => (
                    <button
                      key={p.id_plan}
                      onClick={() => setActive(i)}
                      className={`border-2 border-[#0B0B0D] px-2.5 py-1 text-[11px] font-extrabold uppercase ${i === active ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#1D1810] text-[#9A938A]"}`}
                    >
                      {p.nome}
                    </button>
                  ))}
                </div>
              )}

              {plan.completed_at ? (
                <p className="border-2 border-[#0B0B0D] bg-[#4fc95a] px-3 py-1.5 text-center text-xs font-extrabold uppercase text-[#0B0B0D]">
                  {t("sessionDone", "Treino concluído!")}
                </p>
              ) : (
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
                    {t("progressCount", "{done}/{total} exercícios feitos")
                      .replace("{done}", String(doneCount))
                      .replace("{total}", String(totalCount))}
                  </p>
                  <div className="mt-1 h-2 border border-[#0B0B0D] bg-[#1D1810]">
                    <div
                      className={doneCount === totalCount && totalCount > 0 ? "h-full bg-[#4fc95a]" : "h-full bg-[#F2B705]"}
                      style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              )}

              <ul className="mt-4 space-y-2">
                {plan.exercises.map((ex) => {
                  const muscle = ex.muscle_group ? MUSCLE_LABEL[ex.muscle_group] : null
                  return (
                    <li key={ex.id_plan_exercise}>
                      <button
                        onClick={() => void toggle(plan, ex)}
                        className={`flex w-full items-center gap-3 border-2 border-[#0B0B0D] px-3 py-2.5 text-left ${ex.checked ? "bg-[#1D1810]/60" : "bg-[#1D1810] hover:bg-[#241d12]"}`}
                      >
                        {ex.checked ? (
                          <CheckSquare className="h-6 w-6 shrink-0 text-[#4fc95a]" />
                        ) : (
                          <Square className="h-6 w-6 shrink-0 text-[#9A938A]" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className={`block text-base font-bold leading-snug ${ex.checked ? "line-through text-[#9A938A]" : ""}`}>
                            {ex.exercise_nome}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-[#9A938A]">
                            {ex.sets} {t("seriesLabel", "séries")} × {ex.reps}
                            {ex.load_kg ? ` · ${ex.load_kg}kg` : ""}
                            {ex.rest_seconds ? ` · ${t("restLabel", "descanso {s}s").replace("{s}", String(ex.rest_seconds))}` : ""}
                          </span>
                        </span>
                        {muscle && (
                          <span className="shrink-0 border border-[#0B0B0D] bg-[#15120E] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[#F2B705]">
                            {t(muscle[0], muscle[1])}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
