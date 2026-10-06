// O VOCABULÁRIO VISUAL DA VAQUINHA — fonte ÚNICA das cores da página.
//
// Pedido do Alex (2026-10-05): "modernizar, deixar no estilo games, porém com
// a cor rosa escuro". O molde é o da plataforma de games (canvas quase preto,
// grade fina com luz, painéis translúcidos, borda colorida, título com brilho,
// cantos retos); a cor troca o roxo pelo ROSA ESCURO. O fundo mora em
// `.fl-vaquinha-bg` (globals.css) e as duas coisas têm que andar juntas: mexeu
// num rosa aqui, confere o de lá.
//
// ⚠️ Classes Tailwind com valor arbitrário precisam aparecer LITERAIS no código
// (o compilador varre o texto), por isso cada peça é a string inteira.

/** Rosa escuro — a ação principal (doar, patrocinar, publicar, tipo ativo). */
export const ROSE = "#BE185D"
/** Rosa aceso — brilho, contorno da ação e tinta de destaque sobre o escuro. */
export const ROSE_GLOW = "#F472B6"

/** Painel de conteúdo: vinho translúcido sobre a grade do fundo. */
export const PANEL =
  "border-2 border-[#5A1530] bg-[rgba(48,9,26,0.78)] shadow-[6px_6px_0_0_rgba(90,21,48,0.9)]"
/** Linha/cartão dentro de um painel. */
export const INNER = "border-2 border-[#5A1530] bg-[rgba(70,13,38,0.62)]"
/** Campo de texto. */
export const INPUT =
  "border-2 border-[#5A1530] bg-[rgba(20,5,12,0.7)] text-[#FFE4F1] outline-none placeholder:text-[#FFE4F1]/35 focus:border-[#EC4899]"
/** Botão principal (rosa escuro com brilho). */
export const BTN_PRIMARY =
  "border-2 border-[#F472B6] bg-[#BE185D] text-[#FFE4F1] shadow-[0_0_24px_rgba(236,72,153,0.4)] transition hover:bg-[#9D174D] disabled:opacity-60"
/** Botão secundário (contorno). */
export const BTN_GHOST =
  "border-2 border-[#5A1530] bg-[rgba(48,9,26,0.6)] text-[#FFE4F1] transition hover:border-[#F472B6] disabled:opacity-60"
/** Título de seção: display com o brilho rosa do ambiente. */
export const TITLE = "fl-display text-[#FFE4F1] [text-shadow:0_0_22px_rgba(236,72,153,0.5)]"
/** Rótulo pequeno em caixa alta. */
export const LABEL = "text-[11px] font-bold uppercase tracking-[0.2em] text-[#D99AB9]"
/** Texto apagado. */
export const MUTED = "text-[#D99AB9]"
/** Valor de dinheiro em listas. */
export const MONEY = "font-mono text-sm font-bold text-[#F9A8D4]"
/** Modal (doação/patrocínio): painel opaco, para o fundo não atravessar. */
export const MODAL =
  "border-2 border-[#5A1530] bg-[#1E0712] text-[#FFE4F1] shadow-[0_0_40px_rgba(236,72,153,0.25),8px_8px_0_0_rgba(90,21,48,0.9)]"
