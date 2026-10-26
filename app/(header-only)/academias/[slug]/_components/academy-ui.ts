// Vocabulário visual da academia — o que a página da academia, a página de
// membros e o ranking dividem.
//
// ⚠️ A ACADEMIA MORA DENTRO DO AMBIENTE FITNESS (pedido do Alex, 2026-09-10:
// "ajuste a identidade visual das academias conforme o layout do fitness").
// As cores de superfície (cinza), os botões, o banner desenhado e a sombra do
// headcard são os do `fitness-ui` — REEXPORTADOS, e não copiados: com as constantes
// copiadas, mexer no tom do painel numa das telas deixaria a outra num tom
// diferente sem nada quebrar. O que é SÓ da academia (o status da matrícula,
// o tipo das fichas vencidas) fica aqui.

/** Rótulos de status da matrícula: [chave i18n do ns `Academies`, fallback pt]. */
export const STATUS_KEYS: Record<string, [string, string]> = {
  active: ["statusActive", "Matrícula ativa"],
  overdue: ["statusOverdue", "Mensalidade atrasada"],
  canceled: ["statusCanceled", "Matrícula cancelada"],
  expired: ["statusExpired", "Matrícula vencida"],
  pending: ["statusPending", "Matrícula pendente"],
}

export {
  BANNER_LAYERS,
  BTN_DARK,
  BTN_GOLD,
  EMBER,
  EMBER_GLOW,
  GOLD,
  HEADCARD_SHADOW,
  H_SECTION,
  INNER,
  PANEL,
  initialsOf,
} from "@/app/(header-only)/esportes/_components/fitness-ui"

/** O que a API de fichas vencidas devolve (`GET /academies/:id/expired-plans`). */
export type ExpiredPlans = {
  /**
   * Desde a mig 296 a validade é POR FICHA (30/60/90): não existe mais um
   * número único de dias. Cada aluno traz `validade_dias` e `vence_em`.
   */
  count: number
  members: {
    id_member: string
    id_user: string
    nome: string | null
    membership_status: string
    active_plan_nome: string | null
    active_plan_by_student: boolean
    days_on_plan: number
    validade_dias?: number | null
    vence_em?: string | null
  }[]
}
