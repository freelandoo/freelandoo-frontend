"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Loader2,
  Pencil,
  Plus,
  Ruler,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type GridRow = {
  id_member: string
  nome: string | null
  membership_status: string
  weight_kg: number | null
  height_cm: number | null
  measured_at: string | null
  kcal_day: number
  water_ml_day: number
  active_plan_nome: string | null
  days_on_plan: number | null
  frequency_days_30d: number
  sessions_done_7d: number
}

type Exercise = { id_exercise: string; nome: string; muscle_group: string }

type PlanExercise = {
  id_exercise: string
  exercise_nome: string
  muscle_group?: string | null
  sets: number
  reps: string
  load_kg: number | null
  rest_seconds: number | null
}

type Plan = {
  id_plan: string
  nome: string
  notes: string | null
  is_active: boolean
  days_on_plan: number
  exercises: (PlanExercise & { id_plan_exercise: string })[]
}

type MemberDetail = {
  member: { id_member: string; member_name: string | null; membership_status: string }
  plans: Plan[]
  measurements: { weight_kg: number | null; height_cm: number | null; measured_at: string }[]
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

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function TrainingGrid({ academyId }: { academyId: string }) {
  const t = useTranslations("Workouts")
  const locale = useLocale()

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [rows, setRows] = useState<GridRow[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")

  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // editor de ficha
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState("")
  const [planNotes, setPlanNotes] = useState("")
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([])
  const [saving, setSaving] = useState(false)

  // biblioteca
  const [library, setLibrary] = useState<Exercise[]>([])
  const [muscle, setMuscle] = useState("")
  const [exQ, setExQ] = useState("")

  // medição pelo professor
  const [measW, setMeasW] = useState("")
  const [measH, setMeasH] = useState("")
  const [savingMeas, setSavingMeas] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const loadGrid = useCallback(async () => {
    setState("loading")
    try {
      const res = await fetch(`/api/academies/${academyId}/training-grid?date=${date}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setRows(Array.isArray(data.rows) ? data.rows : [])
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [academyId, date, authHeaders])

  useEffect(() => {
    void loadGrid()
  }, [loadGrid])

  const openMember = useCallback(
    async (id_member: string) => {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/academies/${academyId}/members/${id_member}/plans`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setDetail(data)
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("memberError", "Erro ao abrir aluno"))
      } finally {
        setDetailLoading(false)
      }
    },
    [academyId, authHeaders, t]
  )

  const loadLibrary = useCallback(
    async (m: string, q: string) => {
      try {
        const params = new URLSearchParams()
        if (m) params.set("muscle", m)
        if (q.trim()) params.set("q", q.trim())
        const res = await fetch(`/api/academies/${academyId}/exercises?${params.toString()}`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setLibrary(Array.isArray(data.exercises) ? data.exercises : [])
      } catch {
        setLibrary([])
      }
    },
    [academyId, authHeaders]
  )

  useEffect(() => {
    if (editorOpen) void loadLibrary(muscle, exQ)
  }, [editorOpen, muscle, exQ, loadLibrary])

  const startCreate = useCallback(() => {
    setEditingPlanId(null)
    setPlanName("")
    setPlanNotes("")
    setPlanExercises([])
    setMuscle("")
    setExQ("")
    setEditorOpen(true)
  }, [])

  const startEdit = useCallback((plan: Plan) => {
    setEditingPlanId(plan.id_plan)
    setPlanName(plan.nome)
    setPlanNotes(plan.notes || "")
    setPlanExercises(
      plan.exercises.map((e) => ({
        id_exercise: e.id_exercise,
        exercise_nome: e.exercise_nome,
        sets: e.sets,
        reps: e.reps,
        load_kg: e.load_kg,
        rest_seconds: e.rest_seconds,
      }))
    )
    setMuscle("")
    setExQ("")
    setEditorOpen(true)
  }, [])

  const savePlan = useCallback(async () => {
    if (!detail) return
    if (!planName.trim()) {
      toast.error(t("planNameMissing", "Dê um nome à ficha (ex.: Treino A)"))
      return
    }
    if (planExercises.length === 0) {
      toast.error(t("planExercisesMissing", "Adicione pelo menos 1 exercício"))
      return
    }
    setSaving(true)
    try {
      const body = JSON.stringify({ nome: planName.trim(), notes: planNotes.trim() || null, exercises: planExercises })
      const res = editingPlanId
        ? await fetch(`/api/academies/${academyId}/plans/${editingPlanId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body,
          })
        : await fetch(`/api/academies/${academyId}/members/${detail.member.id_member}/plans`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body,
          })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("planSaved", "Ficha salva!"))
      setEditorOpen(false)
      void openMember(detail.member.id_member)
      void loadGrid()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("planError", "Erro ao salvar ficha"))
    } finally {
      setSaving(false)
    }
  }, [detail, planName, planNotes, planExercises, editingPlanId, academyId, authHeaders, openMember, loadGrid, t])

  const togglePlanActive = useCallback(
    async (plan: Plan) => {
      if (!detail) return
      try {
        const res = await fetch(`/api/academies/${academyId}/plans/${plan.id_plan}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ is_active: !plan.is_active }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        void openMember(detail.member.id_member)
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("planError", "Erro ao salvar ficha"))
      }
    },
    [detail, academyId, authHeaders, openMember, t]
  )

  const deletePlan = useCallback(
    async (plan: Plan) => {
      if (!detail) return
      if (!window.confirm(t("planDeleteConfirm", "Excluir esta ficha? Os checks do aluno somem junto."))) return
      try {
        const res = await fetch(`/api/academies/${academyId}/plans/${plan.id_plan}`, {
          method: "DELETE",
          headers: authHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success(t("planDeleted", "Ficha excluída."))
        void openMember(detail.member.id_member)
        void loadGrid()
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("planError", "Erro ao salvar ficha"))
      }
    },
    [detail, academyId, authHeaders, openMember, loadGrid, t]
  )

  const saveMemberMeasurement = useCallback(async () => {
    if (!detail) return
    const w = measW.trim() ? Number(measW.replace(",", ".")) : null
    const h = measH.trim() ? Number(measH.replace(",", ".")) : null
    if (w === null && h === null) {
      toast.error(t("measureMissing", "Informe peso e/ou altura"))
      return
    }
    setSavingMeas(true)
    try {
      const res = await fetch(`/api/academies/${academyId}/members/${detail.member.id_member}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ weight_kg: w, height_cm: h }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("measureSaved", "Medição registrada!"))
      setMeasW("")
      setMeasH("")
      void openMember(detail.member.id_member)
      void loadGrid()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("measureError", "Erro ao registrar"))
    } finally {
      setSavingMeas(false)
    }
  }, [detail, measW, measH, academyId, authHeaders, openMember, loadGrid, t])

  return (
    <section className="mt-6 border-4 border-current p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-current pb-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide">
          <ClipboardList className="h-4 w-4" />
          {t("gridTitle", "Treinos por data")}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setDate((d) => shiftDate(d, -1))} className="border-2 border-current p-1.5" aria-label={t("prevDay", "Dia anterior")}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="border-2 border-current px-3 py-1.5 text-xs font-black uppercase">
            {new Date(`${date}T12:00:00Z`).toLocaleDateString(locale)}
          </span>
          <button onClick={() => setDate((d) => shiftDate(d, 1))} className="border-2 border-current p-1.5" aria-label={t("nextDay", "Próximo dia")}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {state === "loading" && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin opacity-50" />
        </div>
      )}
      {state === "error" && <p className="mt-4 text-xs opacity-60">{t("gridError", "Erro ao carregar a grade.")}</p>}
      {state === "loaded" && rows.length === 0 && (
        <p className="mt-4 text-xs opacity-60">{t("gridEmpty", "Nenhum membro vinculado ainda.")}</p>
      )}
      {state === "loaded" && rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b-2 border-current font-black uppercase">
                <th className="py-2 pr-3">{t("colAluno", "Aluno")}</th>
                <th className="py-2 pr-3">{t("colPeso", "Peso")}</th>
                <th className="py-2 pr-3">{t("colAltura", "Altura")}</th>
                <th className="py-2 pr-3">{t("colKcal", "Kcal (dia)")}</th>
                <th className="py-2 pr-3">{t("colAgua", "Água (dia)")}</th>
                <th className="py-2 pr-3">{t("colFicha", "Ficha ativa")}</th>
                <th className="py-2 pr-3">{t("colDiasFicha", "Dias c/ ficha")}</th>
                <th className="py-2 pr-3">{t("colFreq", "Freq. 30d")}</th>
                <th className="py-2 pr-3">{t("colSessoes", "Treinos 7d")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id_member}
                  onClick={() => void openMember(r.id_member)}
                  className="cursor-pointer border-b border-current/20 hover:bg-current/5"
                >
                  <td className="py-2 pr-3 font-bold">{r.nome || "—"}</td>
                  <td className="py-2 pr-3">{r.weight_kg ? `${Number(r.weight_kg).toFixed(1)}kg` : "—"}</td>
                  <td className="py-2 pr-3">{r.height_cm ? `${Number(r.height_cm).toFixed(0)}cm` : "—"}</td>
                  <td className="py-2 pr-3">{r.kcal_day || "—"}</td>
                  <td className="py-2 pr-3">{r.water_ml_day ? `${(r.water_ml_day / 1000).toFixed(1)}L` : "—"}</td>
                  <td className="py-2 pr-3">{r.active_plan_nome || <span className="opacity-40">{t("noPlan", "sem ficha")}</span>}</td>
                  <td className="py-2 pr-3">{r.days_on_plan ?? "—"}</td>
                  <td className="py-2 pr-3 font-black">{r.frequency_days_30d}</td>
                  <td className="py-2 pr-3">{r.sessions_done_7d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Painel do aluno */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDetail(null)}>
          <div className="fl-sharp flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto border-4 border-current bg-background p-5" onClick={(e) => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin opacity-50" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b-2 border-current pb-3">
                  <div>
                    <h3 className="text-xl font-black uppercase">{detail.member.member_name || t("memberFallback", "Aluno")}</h3>
                    <p className="text-xs opacity-60">{detail.member.membership_status}</p>
                  </div>
                  <button onClick={() => setDetail(null)} aria-label={t("close", "Fechar")}>
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Medição pelo professor */}
                <div className="mt-4 border-2 border-current p-3">
                  <p className="flex items-center gap-1.5 text-xs font-black uppercase">
                    <Ruler className="h-4 w-4" /> {t("measureByProf", "Avaliação física (registrar)")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase opacity-60">{t("weightLabel", "Peso (kg)")}</span>
                      <input value={measW} onChange={(e) => setMeasW(e.target.value)} inputMode="decimal" className="mt-0.5 w-24 border-2 border-current bg-transparent px-2 py-1 text-sm outline-none" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase opacity-60">{t("heightLabel", "Altura (cm)")}</span>
                      <input value={measH} onChange={(e) => setMeasH(e.target.value)} inputMode="decimal" className="mt-0.5 w-24 border-2 border-current bg-transparent px-2 py-1 text-sm outline-none" />
                    </label>
                    <button
                      onClick={() => void saveMemberMeasurement()}
                      disabled={savingMeas}
                      className="border-2 border-current bg-yellow-400 px-3 py-1.5 text-[11px] font-black uppercase text-black disabled:opacity-50"
                    >
                      {savingMeas ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("measureSubmit", "Salvar")}
                    </button>
                  </div>
                  {detail.measurements.length > 0 && (
                    <p className="mt-2 text-[11px] opacity-60">
                      {t("lastMeasures", "Últimas")}:{" "}
                      {detail.measurements
                        .slice(0, 4)
                        .map((m) => `${m.weight_kg ? Number(m.weight_kg).toFixed(1) + "kg" : ""}${m.height_cm ? " " + Number(m.height_cm).toFixed(0) + "cm" : ""} (${new Date(m.measured_at).toLocaleDateString(locale)})`)
                        .join(" · ")}
                    </p>
                  )}
                </div>

                {/* Fichas */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-xs font-black uppercase">
                    <Dumbbell className="h-4 w-4" /> {t("plansTitle", "Fichas de treino")}
                  </p>
                  <button onClick={startCreate} className="flex items-center gap-1 border-2 border-current bg-yellow-400 px-3 py-1.5 text-[11px] font-black uppercase text-black">
                    <Plus className="h-3.5 w-3.5" /> {t("newPlan", "Nova ficha")}
                  </button>
                </div>
                {detail.plans.length === 0 ? (
                  <p className="mt-2 text-xs opacity-60">{t("plansEmpty", "Nenhuma ficha ainda. Monte a primeira!")}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {detail.plans.map((p) => (
                      <li key={p.id_plan} className={`border-2 border-current p-3 ${p.is_active ? "" : "opacity-50"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black uppercase">
                            {p.nome}
                            {!p.is_active && <span className="ml-2 text-[10px]">{t("planInactive", "(inativa)")}</span>}
                          </p>
                          <div className="flex gap-1.5">
                            <button onClick={() => startEdit(p)} className="border-2 border-current p-1" aria-label={t("editPlan", "Editar")}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => void togglePlanActive(p)} className="border-2 border-current px-2 py-1 text-[10px] font-black uppercase">
                              {p.is_active ? t("deactivate", "Desativar") : t("activate", "Ativar")}
                            </button>
                            <button onClick={() => void deletePlan(p)} className="border-2 border-current p-1" aria-label={t("deletePlan", "Excluir")}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-1 text-[11px] opacity-60">
                          {p.exercises.length} {t("exercisesSuffix", "exercícios")} · {t("daysOnPlan", "{n} dias com esta ficha").replace("{n}", String(p.days_on_plan))}
                        </p>
                        <p className="mt-1 truncate text-[11px] opacity-50">{p.exercises.map((e) => e.exercise_nome).join(" · ")}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Editor de ficha */}
      {editorOpen && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setEditorOpen(false)}>
          <div className="fl-sharp flex max-h-[92vh] w-full max-w-3xl flex-col overflow-y-auto border-4 border-current bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b-2 border-current pb-3">
              <h3 className="text-lg font-black uppercase">
                {editingPlanId ? t("editPlanTitle", "Editar ficha") : t("newPlanTitle", "Nova ficha")} — {detail.member.member_name || t("memberFallback", "Aluno")}
              </h3>
              <button onClick={() => setEditorOpen(false)} aria-label={t("close", "Fechar")}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase opacity-70">{t("planNameLabel", "Nome da ficha")}</span>
                <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder={t("planNamePh", "Treino A")} className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 text-sm outline-none" />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase opacity-70">{t("planNotesLabel", "Observações")}</span>
                <input value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} className="mt-1 w-full border-2 border-current bg-transparent px-3 py-2 text-sm outline-none" />
              </label>
            </div>

            {/* Exercícios escolhidos */}
            <p className="mt-4 text-[11px] font-black uppercase opacity-70">{t("chosenExercises", "Exercícios da ficha")}</p>
            {planExercises.length === 0 ? (
              <p className="mt-1 text-xs opacity-50">{t("chosenEmpty", "Escolha exercícios na biblioteca abaixo.")}</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {planExercises.map((ex, i) => (
                  <li key={`${ex.id_exercise}-${i}`} className="flex flex-wrap items-center gap-2 border-2 border-current px-2 py-1.5 text-xs">
                    <span className="min-w-0 flex-1 truncate font-bold">{ex.exercise_nome}</span>
                    <label className="flex items-center gap-1">
                      <span className="opacity-50">{t("setsShort", "séries")}</span>
                      <input
                        value={String(ex.sets)}
                        onChange={(e) => setPlanExercises((prev) => prev.map((p, j) => (j === i ? { ...p, sets: Number(e.target.value) || 1 } : p)))}
                        inputMode="numeric"
                        className="w-10 border border-current bg-transparent px-1 py-0.5 text-center outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="opacity-50">{t("repsShort", "reps")}</span>
                      <input
                        value={ex.reps}
                        onChange={(e) => setPlanExercises((prev) => prev.map((p, j) => (j === i ? { ...p, reps: e.target.value } : p)))}
                        className="w-14 border border-current bg-transparent px-1 py-0.5 text-center outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="opacity-50">kg</span>
                      <input
                        value={ex.load_kg === null ? "" : String(ex.load_kg)}
                        onChange={(e) => setPlanExercises((prev) => prev.map((p, j) => (j === i ? { ...p, load_kg: e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", ".")) } : p)))}
                        inputMode="decimal"
                        className="w-14 border border-current bg-transparent px-1 py-0.5 text-center outline-none"
                      />
                    </label>
                    <button
                      onClick={() => setPlanExercises((prev) => prev.filter((_, j) => j !== i))}
                      aria-label={t("removeExercise", "Remover exercício")}
                    >
                      <Trash2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Biblioteca */}
            <p className="mt-4 text-[11px] font-black uppercase opacity-70">{t("libraryTitle", "Biblioteca de exercícios")}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {MUSCLES.map(([value, key, fallback]) => (
                <button
                  key={value || "all"}
                  onClick={() => setMuscle(value)}
                  className={`border border-current px-2 py-0.5 text-[10px] font-black uppercase ${muscle === value ? "bg-yellow-400 text-black" : "opacity-60"}`}
                >
                  {t(key, fallback)}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 border-2 border-current px-2 py-1.5">
              <Search className="h-3.5 w-3.5 opacity-50" />
              <input value={exQ} onChange={(e) => setExQ(e.target.value)} placeholder={t("librarySearchPh", "Buscar exercício")} className="w-full bg-transparent text-xs outline-none" />
            </div>
            <ul className="mt-2 max-h-48 overflow-y-auto border-2 border-current">
              {library.length === 0 ? (
                <li className="p-3 text-xs opacity-50">{t("libraryEmpty", "Nenhum exercício encontrado.")}</li>
              ) : (
                library.map((ex) => (
                  <li key={ex.id_exercise}>
                    <button
                      onClick={() =>
                        setPlanExercises((prev) => [
                          ...prev,
                          { id_exercise: ex.id_exercise, exercise_nome: ex.nome, sets: 3, reps: "10", load_kg: null, rest_seconds: 60 },
                        ])
                      }
                      className="flex w-full items-center justify-between border-b border-current/20 px-3 py-1.5 text-left text-xs hover:bg-current/5"
                    >
                      <span>{ex.nome}</span>
                      <Plus className="h-3.5 w-3.5 opacity-60" />
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="mt-4 flex justify-end gap-2 border-t-2 border-current pt-3">
              <button onClick={() => setEditorOpen(false)} className="border-2 border-current px-4 py-2 text-xs font-black uppercase">
                {t("cancel", "Cancelar")}
              </button>
              <button
                onClick={() => void savePlan()}
                disabled={saving}
                className="flex items-center gap-2 border-2 border-current bg-yellow-400 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("planSubmit", "Salvar ficha")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
