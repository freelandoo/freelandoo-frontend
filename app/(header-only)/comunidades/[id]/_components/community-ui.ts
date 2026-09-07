/**
 * O vocabulário visual que a página da comunidade DIVIDE com as telas filhas
 * dela (hoje o ranking cheio, em `[id]/ranking`).
 *
 * Mora aqui e não dentro do `page.tsx` porque a paleta é EDITÁVEL pelo líder e
 * é lida nas duas pontas: a página pinta o headcard com o accent escolhido e o
 * ranking pinta o pódio com o MESMO accent. Copiada, bastaria acrescentar uma
 * cor de um lado para as duas telas da mesma comunidade saírem em tons
 * diferentes — que é a divergência que o `academy-ui.ts` já existe para
 * impedir do lado da academia.
 *
 * Só o que as duas usam entra aqui. Tela nova de comunidade importa daqui em
 * vez de redeclarar.
 */

/**
 * A identidade da comunidade é a do Freelandoo (escuro/tabloide): o líder
 * recolore só os DETALHES (ícones, aba ativa, barra de progresso, botão de
 * entrar, destaques). A base — fundo, cards, texto — é fixa.
 */
export const ACCENTS: { key: string; labelKey: string; fallback: string; hex: string }[] = [
  { key: "gold", labelKey: "accentGold", fallback: "Dourado", hex: "#F2B705" },
  { key: "magenta", labelKey: "accentMagenta", fallback: "Magenta", hex: "#ff1f8e" },
  { key: "cyan", labelKey: "accentCyan", fallback: "Ciano", hex: "#16c8e8" },
  { key: "purple", labelKey: "accentPurple", fallback: "Roxo", hex: "#a06bff" },
  { key: "leaf", labelKey: "accentLeaf", fallback: "Verde folha", hex: "#4fc95a" },
  { key: "red", labelKey: "accentRed", fallback: "Vermelho", hex: "#ff5a44" },
  { key: "orange", labelKey: "accentOrange", fallback: "Laranja", hex: "#ff8c2e" },
  { key: "gray", labelKey: "accentGray", fallback: "Cinza", hex: "#b8b1a6" },
]

/** Chave desconhecida (ou ausente) cai no dourado, que é o padrão da casa. */
export function accentHex(a: string | null | undefined): string {
  return ACCENTS.find((x) => x.key === a)?.hex || ACCENTS[0].hex
}

/** 1.234 → "1.2k". Usado no XP dos membros nas duas telas. */
export function compact(n: number): string {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(Math.round(v))
}
