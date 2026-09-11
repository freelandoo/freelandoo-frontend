// O VOCABULÁRIO VISUAL DA PLATAFORMA FITNESS — fonte ÚNICA das cores e das
// peças que as telas de `/fitness` dividem (mesma razão do `games-ui.ts`, do
// `wallet-ui.tsx`, do `community-ui.ts` e do `academy-ui.ts`). Tela nova de
// fitness importa daqui.
//
// ⚠️ A PALETA É CINZA + LARANJA ESCURO (pedido do Alex, 2026-09-11: "troque a
// paleta de cores da academia, todas as páginas, para cinza e laranja escuro").
// O CINZA é a estrutura e mora na pele `.fl-fitness` (globals.css), que
// reescreve as classes de superfície; o LARANJA ESCURO é o acento e mora
// AQUI, porque estas constantes entram em `style` inline (boxShadow, barra de
// progresso, outline) que folha de estilo nenhuma alcança.
//
// ⚠️ SÃO DOIS LARANJAS, E A DIFERENÇA É O PAPEL — não é gosto: `EMBER`/`GOLD`
// são FUNDO (precisam ser escuros para aceitar tinta clara por cima) e
// `EMBER_GLOW` é TINTA/TRAÇO (precisa de luz para ser lido sobre o cinza).
// Usar o escuro como cor de texto some sobre o painel, e o claro como fundo
// deixa o rótulo preto ilegível.
//
// ⚠️ O laranja é o MESMO do pill de Fitness no headcard do perfil
// (`components/profile/headcard-pills.tsx`): é a mesma porta, e mudar de tom
// por superfície faria procurar duas vezes. Mexeu aqui, mexe lá.

/** Laranja escuro de AÇÃO/superfície — aceita tinta clara por cima. */
export const EMBER = "#9A3412"
/** O mais fundo da família — hover de botão, sombra. */
export const EMBER_DEEP = "#7C2D12"
/** Laranja de TINTA e TRAÇO — o único da família legível sobre o cinza. */
export const EMBER_GLOW = "#D9773B"
/**
 * ⚠️ NOME LEGADO: era o amarelo #F2B705 e hoje é o laranja escuro de ação.
 * O nome ficou porque é importado em ~40 lugares e um rename seria só ruído —
 * mesma disciplina de `tb_machine` e `tb_games_presence` no backend.
 * Ele é sempre FUNDO, SOMBRA ou BARRA; para cor de texto use `EMBER_GLOW`.
 */
export const GOLD = "#B4470F"
export const CYAN = "#16c8e8"
export const INK = "#0B0B0D"

/**
 * O BANNER DESENHADO do ambiente — a grade e o brilho que o headcard do
 * /fitness, o masthead da vitrine de academias, o mini-headcard de cada
 * academia e o headcard da página da academia dividem. É a assinatura do
 * ambiente; a página da academia pinta isto POR CIMA da capa que ela subiu.
 * A brasa é laranja escura; a grade é cinza (era laranja).
 */
export const BANNER_LAYERS = [
  "radial-gradient(70% 120% at 18% 0%, rgba(154, 52, 18, 0.52), transparent 65%)",
  "radial-gradient(60% 120% at 88% 10%, rgba(124, 45, 18, 0.30), transparent 68%)",
  "repeating-linear-gradient(to right, rgba(198, 192, 184, 0.08) 0 1px, transparent 1px 40px)",
  "repeating-linear-gradient(to bottom, rgba(198, 192, 184, 0.06) 0 1px, transparent 1px 40px)",
].join(",")

/** A sombra do headcard: brasa laranja escura + a sombra dura em cinza. */
export const HEADCARD_SHADOW = "0 0 30px rgba(154, 52, 18, 0.32), 8px 8px 0 0 rgba(66, 62, 58, 0.95)"

/**
 * As cores dos quatro pills atrás da foto (pedido do Alex, 2026-09-10).
 * ⚠️ ROSA, TEAL E CYAN FICAM COMO ESTÃO (decisão do Alex, 2026-09-11, na troca
 * da paleta): cada cor identifica UMA sala, e em tons de laranja escuro os
 * quatro viram quase o mesmo botão e deixam de se distinguir de relance.
 * Só o primeiro acompanha o ambiente, porque ele É o laranja do ambiente.
 */
export const PILL = {
  academy: { bg: "#9A3412", hover: "#7C2D12" }, // laranja escuro — Minha academia
  workout: { bg: "#DB2777", hover: "#BE185D" }, // rosa — Treino
  history: { bg: "#0D9488", hover: "#0F766E" }, // turquesa (teal) — Histórico
  indicators: { bg: "#0891B2", hover: "#0E7490" }, // turquesa (cyan) — Indicadores
} as const

// As classes de superfície são as da casca de plataforma: é a pele
// `.fl-fitness` (globals.css) que as pinta na cor do ambiente.
export const PANEL = "border-2 border-[#0B0B0D] bg-[#15120E]"
export const INNER = "border-2 border-[#0B0B0D] bg-[#1D1810]"
// ⚠️ O botão de ação: fundo laranja escuro exige TINTA CLARA. Era amarelo com
// texto quase-preto; mantido assim, o rótulo sumiria dentro do próprio botão.
export const BTN_GOLD =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#B4470F] text-[#F7F1EC] font-extrabold uppercase tracking-[0.12em] disabled:opacity-50"
export const BTN_DARK =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] text-[#F5F1E8] font-extrabold uppercase tracking-[0.12em] hover:bg-[#241d12] disabled:opacity-50"
export const H_SECTION = "flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"
export const INPUT =
  "w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[#F5F1E8] outline-none placeholder:text-[#9A938A]"

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
