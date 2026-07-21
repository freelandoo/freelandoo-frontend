"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Exercise = { id_exercise: string; nome: string; muscle_group: string }

export type EditablePlanExercise = {
  id_exercise: string
  exercise_nome: string
  sets: number
  reps: string
  load_kg: number | null
  rest_seconds: number | null
}

export type EditablePlan = {
  id_plan: string
  nome: string
  notes: string | null
  exercises: EditablePlanExercise[]
}

const MUSCLES = [
  ["", "muscleAll", "Todos"],
  ["peito", "musclePeito", "Peito"],
  ["costas", "muscleCostas", "Costas"],
  ["ombros", "muscleOmbros", "Ombros"],
  ["biceps", "muscleBiceps", "Bíceps"],
  ["triceps", "muscleTriceps", "Tríceps"],
  ["pernas", "musclePernas", "Pernas"],
  ["gluteos", "muscleGluteos", "Glúteos"],
  ["abdomen", "muscleAbdomen", "Abdômen"],
  ["cardio", "muscleCardio", "Cardio"],
  ["corpo_inteiro", "muscleCorpo", "Corpo inteiro"],
] as const

/** Editor da ficha do PRÓPRIO usuário (mig 189). Diferente do editor do
 *  professor (training-grid), aqui salvar aplica DIRETO — a ficha é do dono,
 *  não precisa de aprovação. Só o que vem do professor vira proposta. */
export function WorkoutPlanEditor({
  plan,
  onClose,
  onSaved,
}: {
  plan: EditablePlan | null
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTranslations("Workouts")

  const [nome, setNome] = useState(plan?.nome || "")
  const [notes, setNotes] = useState(plan?.notes || "")
  const [exercises, setExercises] = useState<EditablePlanExercise[]>(plan?.exercises || [])
  const [saving, setSaving] = useState(false)

  const [library, setLibrary] = useState<Exercise[]>([])
  const [muscle, setMuscle] = useState("")
  const [q, setQ] = useState("")

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    let alive = true
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams()
        if (muscle) params.set("muscle", muscle)
        if (q.trim()) params.set("q", q.trim())
        const res = await fetch(`/api/workouts/exercises?${params.toString()}`, { headers: authHeaders() })
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (alive) setLibrary(Array.isArray(data.exercises) ? data.exercises : [])
      } catch {
        if (alive) setLibrary([])
      }
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [muscle, q, authHeaders])

  const move = useCallback((from: number, to: number) => {
    setExercises((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }, [])

  const save = useCallback(async () => {
    if (!nome.trim()) {
      toast.error(t("planNameMissing", "Dê um nome pra ficha (ex.: Treino A)"))
      return
    }
    if (exercises.length === 0) {
      toast.error(t("planExercisesMissing", "Adicione pelo menos 1 exercício"))
      return
    }
    setSaving(true)
    try {
      const body = {
        nome: nome.trim(),
        notes: notes.trim() || null,
        exercises: exercises.map((ex) => ({
          id_exercise: ex.id_exercise,
          sets: ex.sets,
          reps: ex.reps,
          load_kg: ex.load_kg,
          rest_seconds: ex.rest_seconds,
        })),
      }
      const res = await fetch(plan ? `/api/workouts/plans/${plan.id_plan}` : "/api/workouts/plans", {
        method: plan ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "")
      toast.success(t("planSaved", "Ficha salva!"))
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("planError", "Erro ao salvar a ficha"))
    } finally {
      setSaving(false)
    }
  }, [nome, notes, exercises, plan, authHeaders, onSaved, onClose, t])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={onClose}>
      <div
        className="fl-sharp flex max-h-[92vh] w-full max-w-3xl flex-col overflow-y-auto border-2 border-[#0B0B0D] bg-[#15120E] p-5 text-[#F5F1E8]"
        style={{ boxShadow: "8px 8px 0 0 #F2B705" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b-2 border-[#0B0B0D] pb-3">
          <h3 className="text-lg font-black uppercase">
            {plan ? t("editPlanTitle", "Editar ficha") : t("newPlanTitle", "Nova ficha")}
          </h3>
          <button onClick={onClose} aria-label={t("close", "Fechar")}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
              {t("planNameLabel", "Nome da ficha")}
            </span>
            <input
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={t("planNamePh", "Treino A")}
              className="mt-1 w-full border-2 border-[#F2B705] bg-[#1D1810] px-3 py-2 text-sm outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
              {t("planNotesLabel", "Observações")}
            </span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-sm outline-none focus:border-[#F2B705]"
            />
          </label>
        </div>

        {/* Exercícios escolhidos */}
        <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
          {t("chosenExercises", "Exercícios da ficha")}
        </p>
        {exercises.length === 0 ? (
          <p className="mt-1 text-xs opacity-50">{t("chosenEmpty", "Escolha exercícios na biblioteca abaixo.")}</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {exercises.map((ex, i) => (
              <li
                key={`${ex.id_exercise}-${i}`}
                className="flex flex-wrap items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-xs"
              >
                <span className="min-w-0 flex-1 truncate font-bold">{ex.exercise_nome}</span>
                <label className="flex items-center gap-1">
                  <span className="opacity-50">{t("setsShort", "séries")}</span>
                  <input
                    value={String(ex.sets)}
                    onChange={(e) =>
                      setExercises((prev) => prev.map((p, j) => (j === i ? { ...p, sets: Number(e.target.value) || 1 } : p)))
                    }
                    inputMode="numeric"
                    className="w-10 border border-[#0B0B0D] bg-[#15120E] px-1 py-0.5 text-center outline-none"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="opacity-50">{t("repsShort", "reps")}</span>
                  <input
                    value={ex.reps}
                    onChange={(e) => setExercises((prev) => prev.map((p, j) => (j === i ? { ...p, reps: e.target.value } : p)))}
                    className="w-14 border border-[#0B0B0D] bg-[#15120E] px-1 py-0.5 text-center outline-none"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="opacity-50">kg</span>
                  <input
                    value={ex.load_kg === null ? "" : String(ex.load_kg)}
                    onChange={(e) =>
                      setExercises((prev) =>
                        prev.map((p, j) =>
                          j === i
                            ? { ...p, load_kg: e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", ".")) }
                            : p
                        )
                      )
                    }
                    inputMode="decimal"
                    className="w-14 border border-[#0B0B0D] bg-[#15120E] px-1 py-0.5 text-center outline-none"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="opacity-50">{t("restShort", "desc. (s)")}</span>
                  <input
                    value={ex.rest_seconds === null ? "" : String(ex.rest_seconds)}
                    onChange={(e) =>
                      setExercises((prev) =>
                        prev.map((p, j) =>
                          j === i
                            ? { ...p, rest_seconds: e.target.value.trim() === "" ? null : Number(e.target.value) || 0 }
                            : p
                        )
                      )
                    }
                    inputMode="numeric"
                    className="w-14 border border-[#0B0B0D] bg-[#15120E] px-1 py-0.5 text-center outline-none"
                  />
                </label>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={t("moveUp", "Subir exercício")} className="disabled:opacity-20">
                  <ArrowUp className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                </button>
                <button
                  onClick={() => move(i, i + 1)}
                  disabled={i === exercises.length - 1}
                  aria-label={t("moveDown", "Descer exercício")}
                  className="disabled:opacity-20"
                >
                  <ArrowDown className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                </button>
                <button
                  onClick={() => setExercises((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={t("removeExercise", "Remover exercício")}
                >
                  <Trash2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Biblioteca */}
        <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A938A]">
          {t("libraryTitle", "Biblioteca de exercícios")}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {MUSCLES.map(([value, key, fallback]) => (
            <button
              key={value || "all"}
              onClick={() => setMuscle(value)}
              className={`border border-[#0B0B0D] px-2 py-0.5 text-[10px] font-black uppercase ${
                muscle === value ? "bg-[#F2B705] text-[#0B0B0D]" : "bg-[#15120E] opacity-60"
              }`}
            >
              {t(key, fallback)}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5">
          <Search className="h-3.5 w-3.5 opacity-50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("librarySearchPh", "Buscar exercício")}
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>
        <ul className="mt-2 max-h-48 overflow-y-auto border-2 border-[#0B0B0D] bg-[#1D1810]">
          {library.length === 0 ? (
            <li className="p-3 text-xs opacity-50">{t("libraryEmpty", "Nenhum exercício encontrado.")}</li>
          ) : (
            library.map((ex) => (
              <li key={ex.id_exercise}>
                <button
                  onClick={() =>
                    setExercises((prev) => [
                      ...prev,
                      { id_exercise: ex.id_exercise, exercise_nome: ex.nome, sets: 3, reps: "10", load_kg: null, rest_seconds: 60 },
                    ])
                  }
                  className="flex w-full items-center justify-between border-b border-[#F5F1E8]/10 px-3 py-1.5 text-left text-xs hover:bg-[#241d12]"
                >
                  <span>{ex.nome}</span>
                  <Plus className="h-3.5 w-3.5 opacity-60" />
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="mt-4 flex justify-end gap-2 border-t-2 border-[#0B0B0D] pt-3">
          <button onClick={onClose} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-2 text-xs font-black uppercase">
            {t("cancel", "Cancelar")}
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            className="flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-black uppercase text-[#0B0B0D] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("planSubmit", "Salvar ficha")}
          </button>
        </div>
      </div>
    </div>
  )
}
