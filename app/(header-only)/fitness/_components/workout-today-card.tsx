"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckSquare, Dumbbell, Loader2, Square } from "lucide-react"
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

/** Card "Treino de hoje" do painel /fitness (dados da fase 3 — fichas). */
export function WorkoutTodayCard({ date, refreshKey = 0 }: { date: string; refreshKey?: number }) {
  const t = useTranslations("Workouts")
  const [plans, setPlans] = useState<Plan[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [active, setActive] = useState(0)

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
          <p className="mt-1 text-sm font-black">{plan.nome}</p>
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
              <li key={ex.id_plan_exercise}>
                <button onClick={() => void toggle(plan, ex)} className="flex w-full items-center gap-2 text-left text-xs hover:bg-[#1D1810]">
                  {ex.checked ? <CheckSquare className="h-4 w-4 shrink-0 text-[#4fc95a]" /> : <Square className="h-4 w-4 shrink-0 text-[#9A938A]" />}
                  <span className={`min-w-0 flex-1 truncate ${ex.checked ? "line-through text-[#9A938A]" : ""}`}>{ex.exercise_nome}</span>
                  <span className="shrink-0 font-bold text-[#9A938A]">
                    {ex.sets}×{ex.reps}
                    {ex.load_kg ? ` · ${ex.load_kg}kg` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
