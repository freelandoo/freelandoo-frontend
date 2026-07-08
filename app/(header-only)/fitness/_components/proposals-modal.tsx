"use client"

// Modal de propostas do professor (mig 180): quando o staff da academia edita
// peso/altura, limite de calorias ou fichas de treino, a alteração fica
// pendente e o aluno confirma ou recusa aqui. Push via socket
// "fitness:proposal"; um grupo (professor+academia) por vez.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ClipboardCheck, Dumbbell, Flame, Loader2, MessageSquare, Ruler, Trash2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { onRealtime } from "@/lib/realtime"

type ProposalExercise = {
  exercise_nome: string
  sets: number
  reps: string
  load_kg: number | null
}

export type FitnessProposal = {
  id_proposal: string
  id_academy: string
  kind: "measurement" | "kcal_goal" | "plan_create" | "plan_update" | "plan_delete"
  payload: {
    weight_kg?: number | null
    height_cm?: number | null
    daily_kcal_goal?: number
    nome?: string
    notes?: string | null
    is_active?: boolean
    plan_nome?: string | null
    exercises?: ProposalExercise[]
  }
  created_at: string
  academy_nome: string
  academy_slug: string
  professor_nome: string | null
  professor_username: string | null
  professor_profile_id: string | null
}

function ProposalLine({ p }: { p: FitnessProposal }) {
  const t = useTranslations("Fitness")
  const payload = p.payload || {}

  if (p.kind === "measurement") {
    const parts: string[] = []
    if (payload.weight_kg !== null && payload.weight_kg !== undefined)
      parts.push(`${t("propWeight", "Peso")}: ${Number(payload.weight_kg).toFixed(1)} kg`)
    if (payload.height_cm !== null && payload.height_cm !== undefined)
      parts.push(`${t("propHeight", "Altura")}: ${Number(payload.height_cm).toFixed(0)} cm`)
    return (
      <div className="flex items-start gap-2">
        <Ruler className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm font-bold">{parts.join(" · ")}</p>
      </div>
    )
  }

  if (p.kind === "kcal_goal") {
    return (
      <div className="flex items-start gap-2">
        <Flame className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="text-sm font-bold">
          {t("propKcal", "Limite diário de calorias")}: {payload.daily_kcal_goal} kcal
        </p>
      </div>
    )
  }

  if (p.kind === "plan_delete") {
    return (
      <div className="flex items-start gap-2">
        <Trash2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        <p className="text-sm font-bold">
          {t("propPlanDelete", 'Excluir a ficha "{name}"').replace("{name}", payload.plan_nome || "")}
        </p>
      </div>
    )
  }

  // plan_create / plan_update
  const title =
    p.kind === "plan_create"
      ? t("propPlanCreate", 'Nova ficha "{name}"').replace("{name}", payload.nome || "")
      : t("propPlanUpdate", 'Ficha "{name}" alterada').replace("{name}", payload.nome || payload.plan_nome || "")
  return (
    <div className="flex items-start gap-2">
      <Dumbbell className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {title}
          {p.kind === "plan_update" && payload.is_active === false && (
            <span className="ml-2 text-[10px] font-black uppercase opacity-60">{t("propPlanOff", "(desativar)")}</span>
          )}
          {p.kind === "plan_update" && payload.is_active === true && (
            <span className="ml-2 text-[10px] font-black uppercase opacity-60">{t("propPlanOn", "(ativar)")}</span>
          )}
        </p>
        {Array.isArray(payload.exercises) && payload.exercises.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs opacity-70">
            {payload.exercises.map((ex, i) => (
              <li key={i} className="truncate">
                {ex.exercise_nome} — {ex.sets}×{ex.reps}
                {ex.load_kg ? ` · ${ex.load_kg}kg` : ""}
              </li>
            ))}
          </ul>
        )}
        {payload.notes ? <p className="mt-1 text-xs italic opacity-60">{payload.notes}</p> : null}
      </div>
    </div>
  )
}

/** Busca propostas pendentes e mostra o modal (um professor/academia por vez). */
export function FitnessProposalsGate({ onApplied }: { onApplied: () => void }) {
  const t = useTranslations("Fitness")
  const locale = useLocale()
  const [proposals, setProposals] = useState<FitnessProposal[]>([])
  const [resolving, setResolving] = useState<null | "accept" | "decline">(null)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    if (!getToken()) return
    try {
      const res = await fetch("/api/fitness/proposals", { headers: authHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setProposals(Array.isArray(data.proposals) ? data.proposals : [])
    } catch {
      /* silencioso — sem proposta não bloqueia o painel */
    }
  }, [authHeaders])

  useEffect(() => {
    void load()
    const off = onRealtime("fitness:proposal", () => void load())
    return off
  }, [load])

  // Grupo do modal: propostas do mesmo professor+academia da pendente mais antiga.
  const group = useMemo(() => {
    if (proposals.length === 0) return null
    const first = proposals[0]
    const key = `${first.id_academy}:${first.professor_username || first.professor_nome || ""}`
    return proposals.filter((p) => `${p.id_academy}:${p.professor_username || p.professor_nome || ""}` === key)
  }, [proposals])

  const resolve = useCallback(
    async (action: "accept" | "decline") => {
      if (!group || group.length === 0) return
      setResolving(action)
      try {
        const res = await fetch("/api/fitness/proposals/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ action, ids: group.map((p) => p.id_proposal) }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        toast.success(
          action === "accept"
            ? t("propAccepted", "Alterações aplicadas!")
            : t("propDeclined", "Alterações recusadas.")
        )
        await load()
        if (action === "accept") onApplied()
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("propError", "Erro ao responder"))
      } finally {
        setResolving(null)
      }
    },
    [group, authHeaders, load, onApplied, t]
  )

  if (!group || group.length === 0) return null
  const head = group[0]
  const professorLabel = head.professor_nome || head.professor_username || t("propProfessor", "Professor")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="fl-sharp flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto border-4 border-current bg-background">
        <div className="border-b-2 border-current p-4">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">
            <ClipboardCheck className="h-4 w-4" /> {t("propEyebrow", "Alteração do professor")}
          </p>
          <h2 className="mt-1 text-xl font-black uppercase leading-tight">
            {t("propTitle", "{who} sugeriu alterações").replace("{who}", professorLabel)}
          </h2>
          <p className="mt-1 text-xs opacity-60">
            {head.academy_nome} · {new Date(head.created_at).toLocaleDateString(locale)}
          </p>
        </div>

        <div className="flex-1 space-y-3 p-4">
          {group.map((p) => (
            <div key={p.id_proposal} className="border-2 border-current p-3">
              <ProposalLine p={p} />
            </div>
          ))}
          <p className="text-xs opacity-60">
            {t("propHint", "Nada muda no seu painel até você confirmar. Se recusar, o professor é quem refaz.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-current p-4">
          {head.professor_profile_id ? (
            <Link
              href={`/mensagens?with=${encodeURIComponent(head.professor_profile_id)}`}
              className="flex items-center gap-1.5 border-2 border-current px-4 py-2 text-xs font-black uppercase"
            >
              <MessageSquare className="h-3.5 w-3.5" /> {t("propChat", "Chat")}
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void resolve("decline")}
              disabled={resolving !== null}
              className="flex items-center gap-2 border-2 border-red-600 bg-red-600 px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-50"
            >
              {resolving === "decline" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("propDecline", "Recusar")}
            </button>
            <button
              onClick={() => void resolve("accept")}
              disabled={resolving !== null}
              className="flex items-center gap-2 border-2 border-current bg-yellow-400 px-4 py-2 text-xs font-black uppercase text-black disabled:opacity-50"
            >
              {resolving === "accept" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("propAccept", "Confirmar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
