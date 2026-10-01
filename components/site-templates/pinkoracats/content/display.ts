// COMO CADA PRODUTO É EXPOSTO — a regra ÚNICA do modo de vitrine.
//
// ⚠️ É AQUI, E SÓ AQUI, que se decide entre caixa digital, foto híbrida,
// editorial etc. Todos os lugares que desenham um produto (herói, parede,
// esteira, pilha, quick view, página, carrinho, busca) chamam `containerOf`.
// Escrita em cada vitrine, a regra divergiria na primeira foto nova — e a
// mesma peça apareceria dentro de uma caixa na home e sem ela na página.
//
// ORDEM DE DECISÃO:
//   1. `media.container` explícito (dado do mock, ou a linha "Exibição" da Loja)
//   2. sem foto                       → `digital-case` (o placeholder)
//   3. foto `.png` com `fit: contain` → `transparent`
//   4. foto                           → `hybrid` (a foto já costuma mostrar a caixa)
//
// ── A TAIZ ESCOLHE SEM CÓDIGO ───────────────────────────────────────────────
// Uma linha na descrição do produto, na aba Loja, muda o modo:
//   • Exibição: caixa        → digital-case (a foto vai DENTRO da caixa digital)
//   • Exibição: foto         → photo
//   • Exibição: editorial    → editorial (foto com mão / ambiente)
//   • Exibição: transparente → transparent (PNG sem fundo)
//   • Exibição: macro        → macro
//   • Exibição: híbrida      → hybrid
// A linha é lida e SOME dos detalhes mostrados à compradora.

import type { MediaContainer, Product } from "./products.mock"

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()

const WORDS: [RegExp, MediaContainer][] = [
  [/caixa|case|acrilic/, "digital-case"],
  [/transparent|png|sem fundo/, "transparent"],
  [/editorial|mao|ambiente/, "editorial"],
  [/macro|detalhe/, "macro"],
  [/hibrid|hybrid/, "hybrid"],
  [/foto|photo/, "photo"],
]

const DISPLAY_LINE = /^(exibicao|exibir|vitrine)\s*[:\-]?/

/** É a linha de controle "Exibição: …"? (não aparece para a compradora) */
export function isDisplayLine(line: string): boolean {
  return DISPLAY_LINE.test(norm(line))
}

/** O modo declarado na descrição, ou `null`. */
export function declaredContainer(details: string[]): MediaContainer | null {
  for (const raw of details) {
    const l = norm(raw)
    if (!DISPLAY_LINE.test(l)) continue
    const rest = l.replace(DISPLAY_LINE, "")
    const hit = WORDS.find(([re]) => re.test(rest))
    if (hit) return hit[1]
  }
  return null
}

export function containerOf(src: string | null | undefined, media?: Product["media"]): MediaContainer {
  if (media?.container) return media.container
  if (!src) return "digital-case"
  if (/\.png(\?|$)/i.test(src) && media?.fit === "contain") return "transparent"
  return "hybrid"
}

/** Os modos em que o SITE desenha a caixa (com tampa que abre). */
export function drawsCase(c: MediaContainer): boolean {
  return c === "digital-case" || c === "transparent"
}

/** Rótulo de vitrine: "PC / 001". É display, nunca substitui o SKU real. */
export function displayId(number: string): string {
  return `PC / ${String(number).padStart(3, "0")}`
}

/**
 * Os nomes de View Transition compartilhados entre páginas (`vt.tsx`).
 * ⚠️ Aqui, num módulo comum, porque o SERVIDOR os escreve na página de destino
 * — função de módulo "use client" não pode ser chamada pelo servidor.
 */
export const vtCollection = (slug: string) => `pk-col-${slug.replace(/[^a-z0-9-]/gi, "")}`
export const vtProduct = (id: string) => `pk-prod-${id.replace(/[^a-z0-9-]/gi, "")}`
