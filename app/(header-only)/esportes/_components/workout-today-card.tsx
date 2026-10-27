"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { ChevronLeft, ClipboardList, Loader2, Maximize2, Pencil, Plus, Trash2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { WorkoutPlanEditor, type EditablePlan } from "./workout-plan-editor"
import { ValidityLine } from "./workout-validity"
import { WorkoutChecklist, type ChecklistItem } from "./ui/workout-checklist"
import { SP } from "./ui/sp-tokens"

type PlanExercise = {
  id_plan_exercise: string
  id_exercise: string
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
  notes: string | null
  days_on_plan: number
  /** Validade da ficha (mig 296): 30/60/90 e o vencimento pronto da API. */
  validade_dias?: number | null
  vence_em?: string | null
  completed_at: string | null
  /** Autoria (mig 189): ficha que o próprio usuário montou × ficha do professor. */
  by_student: boolean
  academy_nome: string | null
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

/**
 * Card "Treino de hoje" do /esportes/treino (fichas da fase 3).
 *
 * Repaginada 2026-10-27: o miolo é o CHECKLIST (`ui/workout-checklist`) —
 * placar enorme "2/6" no topo, barra segmentada, check quadrado grande com
 * animação de prazer, rodapé "2 de 6 concluídos". É a MESMA peça no card e na
 * ficha em tela cheia (dois desenhos divergiriam na primeira mudança).
 */
export function WorkoutTodayCard({ date, refreshKey = 0 }: { date: string; refreshKey?: number }) {
  const t = useTranslations("Workouts")
  const tf = useTranslations("Fitness")
  const [plans, setPlans] = useState<Plan[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(false)
  // null = fechado; { plan: null } = criando; { plan } = editando
  const [editor, setEditor] = useState<{ plan: EditablePlan | null } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  // ⚠️ GERAÇÃO DO LOAD: cada toque recarrega a lista inteira; com toques
  // rápidos uma resposta VELHA chegava depois e desfazia o toque mais novo (o ✓
  // sumia e voltava — a piscada mata o prazer do check). Resposta de um load
  // que começou antes do último toque é descartada.
  const gen = useRef(0)
  const load = useCallback(async () => {
    const at = gen.current
    try {
      const res = await fetch(`/api/workouts/today?date=${date}`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (at !== gen.current) return
      const next: Plan[] = Array.isArray(data.plans) ? data.plans : []
      setPlans(next)
      // A ficha selecionada pode ter sumido (exclusão) — não deixar índice órfão.
      setActive((a) => Math.min(a, Math.max(0, next.length - 1)))
      setState("loaded")
    } catch {
      if (at === gen.current) setState((s) => (s === "loaded" ? s : "error"))
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
      gen.current++
      const mine = gen.current
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
        if (mine === gen.current) void load()
      } catch {
        toast.error(tf("chkSaveError", "Não deu pra salvar o check"))
        if (mine === gen.current) void load()
      }
    },
    [authHeaders, date, load, tf]
  )

  const openEditor = useCallback((p: Plan | null) => {
    setEditor({
      plan: p
        ? {
            id_plan: p.id_plan,
            nome: p.nome,
            notes: p.notes,
            validade_dias: p.validade_dias ?? null,
            exercises: p.exercises.map((ex) => ({
              id_exercise: ex.id_exercise,
              exercise_nome: ex.exercise_nome,
              sets: ex.sets,
              reps: ex.reps,
              load_kg: ex.load_kg,
              rest_seconds: ex.rest_seconds,
            })),
          }
        : null,
    })
  }, [])

  const removePlan = useCallback(
    async (p: Plan) => {
      if (!window.confirm(t("planDeleteConfirmOwn", "Excluir esta ficha? Seus checks dela somem junto."))) return
      setDeleting(true)
      try {
        const res = await fetch(`/api/workouts/plans/${p.id_plan}`, { method: "DELETE", headers: authHeaders() })
        if (!res.ok) throw new Error()
        toast.success(t("planDeleted", "Ficha excluída"))
        setExpanded(false)
        void load()
      } catch {
        toast.error(t("planDeleteError", "Erro ao excluir a ficha"))
      } finally {
        setDeleting(false)
      }
    },
    [authHeaders, load, t]
  )

  const plan = plans[active]
  const items: ChecklistItem[] = useMemo(
    () =>
      plan
        ? plan.exercises.map((ex) => {
            const muscle = ex.muscle_group ? MUSCLE_LABEL[ex.muscle_group] : null
            return {
              id: ex.id_plan_exercise,
              name: ex.exercise_nome,
              sets: ex.sets,
              reps: ex.reps,
              load_kg: ex.load_kg,
              rest_seconds: ex.rest_seconds,
              muscle: muscle ? t(muscle[0], muscle[1]) : null,
              checked: ex.checked,
            }
          })
        : [],
    [plan, t]
  )
  const onToggle = useCallback(
    (it: ChecklistItem) => {
      if (!plan) return
      const ex = plan.exercises.find((e) => e.id_plan_exercise === it.id)
      if (ex) void toggle(plan, ex)
    },
    [plan, toggle]
  )

  const author = plan
    ? plan.by_student
      ? t("ownPlanBadge", "Feita por você")
      : plan.academy_nome
        ? `${t("profPlanBadge", "Do professor")} · ${plan.academy_nome}`
        : t("profPlanBadge", "Do professor")
    : ""

  const header = (full: boolean) =>
    plan && (
      <div className="flex items-start gap-3 border-b-2 px-4 py-3" style={{ borderColor: SP.room.workout, background: SP.panel }}>
        {full ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="inline-flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]"
            style={{ background: SP.inner }}
          >
            <ChevronLeft className="h-4 w-4" />
            {tf("chkBack", "Voltar")}
          </button>
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center border-2 border-[#0B0B0D] text-[#0B0B0D]" style={{ background: SP.ember }}>
            <ClipboardList className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="fl-display truncate text-2xl leading-none md:text-[28px]">{plan.nome}</h3>
          <p className="mt-1 font-mono text-[11px]" style={{ color: SP.mute }}>
            <span style={plan.by_student ? { color: SP.glow } : undefined}>{author}</span>
            {" · "}
            {t("daysOnPlan", "{n} dias com esta ficha").replace("{n}", String(plan.days_on_plan))}
            {" · "}
            <ValidityLine validadeDias={plan.validade_dias} venceEm={plan.vence_em} />
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!full && (
            <IconBtn label={t("openPlanModal", "Abrir ficha em tela cheia")} onClick={() => setExpanded(true)}>
              <Maximize2 className="h-4 w-4" />
            </IconBtn>
          )}
          {plan.by_student && (
            <>
              <IconBtn label={t("editPlan", "Editar")} onClick={() => openEditor(plan)}>
                <Pencil className="h-4 w-4" />
              </IconBtn>
              <IconBtn label={t("deletePlan", "Excluir")} onClick={() => void removePlan(plan)} disabled={deleting}>
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </>
          )}
        </div>
      </div>
    )

  const tabs = plans.length > 1 && (
    <div className="flex border-2 border-[#0B0B0D]">
      {plans.map((p, i) => (
        <button
          key={p.id_plan}
          type="button"
          onClick={() => setActive(i)}
          className="relative min-w-0 flex-1 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em]"
          style={{ color: i === active ? "#0B0B0D" : SP.ink, background: i === active ? "transparent" : SP.inner }}
        >
          {i === active && <motion.span layoutId="esp-plan-tab" className="absolute inset-0" style={{ background: SP.ember }} />}
          <span className="relative block truncate" title={p.nome}>
            {p.nome}
          </span>
        </button>
      ))}
    </div>
  )

  const checklist = (size: number) =>
    plan && (
      <WorkoutChecklist
        items={items}
        planKey={plan.id_plan}
        dayKey={date}
        onToggle={onToggle}
        checkSize={size}
        completedAt={plan.completed_at}
      />
    )

  return (
    <div className="space-y-3 text-[#F5F1E8]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: SP.mute }}>
          {t("todayTitle", "Treino de hoje")}
        </p>
        <button
          type="button"
          onClick={() => openEditor(null)}
          className="flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] px-2 py-1 text-[10px] font-black uppercase text-[#0B0B0D]"
          style={{ background: SP.ember }}
        >
          <Plus className="h-3.5 w-3.5" /> {t("newPlan", "Nova ficha")}
        </button>
      </div>

      {tabs}

      <div className="relative border-2 border-[#0B0B0D]" style={{ background: SP.panel, boxShadow: `8px 8px 0 0 ${SP.room.workout}` }}>
        {state === "loading" && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: SP.dim }} />
          </div>
        )}
        {state === "error" && (
          <div className="px-4 py-8 text-center text-sm" style={{ color: SP.mute }}>
            {tf("loadError", "Erro ao carregar o painel. Tente novamente.")}{" "}
            <button type="button" onClick={() => void load()} className="underline underline-offset-2">
              {tf("retry", "Tentar de novo")}
            </button>
          </div>
        )}
        {state === "loaded" && !plan && (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-4 max-w-xs space-y-2 opacity-50">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 border-2 border-dashed px-3 py-2.5" style={{ borderColor: SP.mute }}>
                  <span className="h-8 w-8 border-2 border-dashed" style={{ borderColor: SP.mute }} />
                  <span className="h-2 flex-1" style={{ background: `${SP.mute}44` }} />
                </div>
              ))}
            </div>
            <p className="fl-display text-2xl leading-none">{tf("chkNoPlanTitle", "Nenhuma ficha ativa")}</p>
            <p className="mx-auto mt-2 max-w-sm text-xs" style={{ color: SP.mute }}>
              {t("todayEmptyOwn", "Nenhuma ficha ativa. Monte a sua aqui ou peça pro seu professor montar na academia.")}
            </p>
            <button
              type="button"
              onClick={() => openEditor(null)}
              className="mt-4 inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D]"
              style={{ background: SP.ember }}
            >
              <Plus className="h-4 w-4" /> {tf("chkBuildPlan", "Montar minha ficha")}
            </button>
          </div>
        )}
        {plan && (
          <>
            {header(false)}
            {checklist(56)}
          </>
        )}
      </div>

      {/* Ficha em tela cheia — o MESMO checklist, maior */}
      {expanded && plan && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/85 md:items-center md:p-4" onClick={() => setExpanded(false)}>
          <div
            className="fl-sharp flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-y-auto border-2 border-[#0B0B0D] text-[#F5F1E8] md:max-h-[92vh]"
            style={{ background: SP.panel, boxShadow: `8px 8px 0 0 ${SP.room.workout}` }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={plan.nome}
          >
            {header(true)}
            {plans.length > 1 && <div className="px-3 pt-3">{tabs}</div>}
            {checklist(60)}
          </div>
        </div>
      )}

      {/* Editor da ficha própria — salva direto, sem passar por aprovação */}
      {editor && <WorkoutPlanEditor plan={editor.plan} onClose={() => setEditor(null)} onSaved={() => void load()} />}
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      whileTap={{ x: 2, y: 2 }}
      className="grid h-9 w-9 place-items-center border-2 border-[#0B0B0D] disabled:opacity-50"
      style={{ background: SP.inner, boxShadow: "2px 2px 0 0 #0B0B0D" }}
    >
      {children}
    </motion.button>
  )
}
