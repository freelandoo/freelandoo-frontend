// Vocabulário visual da academia — a identidade tabloide escura/dourada que a
// página da academia, a página de membros e o ranking dividem.
//
// Mora num arquivo só porque a página de membros nasceu recortando a página da
// academia: com as constantes copiadas, mexer no tom do painel numa delas
// deixaria a outra num tom diferente sem nada quebrar. O mesmo vale para
// STATUS_KEYS, que traduz o status da matrícula nas DUAS telas.

/** Rótulos de status da matrícula: [chave i18n do ns `Academies`, fallback pt]. */
export const STATUS_KEYS: Record<string, [string, string]> = {
  active: ["statusActive", "Matrícula ativa"],
  overdue: ["statusOverdue", "Mensalidade atrasada"],
  canceled: ["statusCanceled", "Matrícula cancelada"],
  expired: ["statusExpired", "Matrícula vencida"],
  pending: ["statusPending", "Matrícula pendente"],
}

export const GOLD = "#F2B705"
export const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
export const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
export const BTN_GOLD =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
export const BTN_DARK =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] font-extrabold uppercase tracking-[0.12em] hover:bg-[#241d12] disabled:opacity-50"
export const H_SECTION =
  "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"

/** O que a API de fichas vencidas devolve (`GET /academies/:id/expired-plans`). */
export type ExpiredPlans = {
  /** Quantos dias de ficha contam como vencida. Vem do backend — não guardar 90 aqui. */
  days: number
  count: number
  members: {
    id_member: string
    id_user: string
    nome: string | null
    membership_status: string
    active_plan_nome: string | null
    active_plan_by_student: boolean
    days_on_plan: number
  }[]
}
