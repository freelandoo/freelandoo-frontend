// O VOCABULÁRIO VISUAL DA PLATAFORMA FITNESS — fonte ÚNICA das cores e das
// peças que as telas de `/fitness` dividem (mesma razão do `games-ui.ts`, do
// `wallet-ui.tsx`, do `community-ui.ts` e do `academy-ui.ts`). Tela nova de
// fitness importa daqui.
//
// O laranja é o MESMO do pill de Fitness no headcard do perfil (`#C2410C`): é
// a mesma porta, e mudar de tom por superfície faria procurar duas vezes. O
// dourado e o ciano são os que o painel já usava (calorias e água) e ficam.

export const EMBER = "#C2410C"
export const EMBER_DEEP = "#9A3412"
export const EMBER_GLOW = "#FB923C"
export const GOLD = "#F2B705"
export const CYAN = "#16c8e8"
export const INK = "#0B0B0D"

/** As cores dos quatro pills atrás da foto (pedido do Alex, 2026-09-10). */
export const PILL = {
  academy: { bg: "#C2410C", hover: "#9A3412" }, // laranja — Minha academia
  workout: { bg: "#DB2777", hover: "#BE185D" }, // rosa — Treino
  history: { bg: "#0D9488", hover: "#0F766E" }, // turquesa (teal) — Histórico
  indicators: { bg: "#0891B2", hover: "#0E7490" }, // turquesa (cyan) — Indicadores
} as const

// As classes de superfície são as da casca de plataforma: é a pele
// `.fl-fitness` (globals.css) que as pinta na cor do ambiente.
export const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
export const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
export const BTN_GOLD =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] text-[#0B0B0D] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
export const BTN_DARK =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] font-extrabold uppercase tracking-[0.12em] hover:bg-[#241d12] disabled:opacity-50"
export const H_SECTION = "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"
export const INPUT =
  "w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"

/** Rótulos de status das mensalidades da academia (chave i18n + fallback). */
export const PAY_STATUS: Record<string, [string, string]> = {
  paid: ["payPaid", "Pago"],
  pending: ["payPending", "Pendente"],
  overdue: ["payOverdue", "Atrasado"],
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// As peças de estado e as iniciais são as MESMAS da Carteira e do Games —
// reexportadas, e não copiadas.
export { StateBox } from "@/app/(header-only)/wallet/_components/wallet-ui"
export { initialsOf } from "@/lib/initials"
