// features/meu-mundo/ui/kit/type-scale.ts — a ESCADA ÚNICA de letra e os espaços do
// Meu Mundo (apresentação, etapa 01 · decisão D14 do plano 2026-11-11).
//
// Contraste de escala: rótulo pequeno, número grande, letreiro enorme, nada no meio.
// Medido para o celular de 390 de largura. Nada abaixo de 11 px.
//
//   11 rótulo · legenda de botão · descrição curta
//   13 texto corrido · item de lista
//   16 título da tela (barra de cima) · nome do item/personagem
//   24 número que importa (Poder, recarga, quantidade)
//   40 letreiro médio (contador da luta, raridade grande)
//   72 letreiro de tela (VITÓRIA, nome no cartão)
//
// Os três de cima (24 · 40 · 72) são Anton/condensada; os de baixo, a família de texto
// (Archivo). Número de luta pode ser itálico. Tela nova ou refeita usa SÓ estes valores;
// o censo de 11/11 achou 43 tamanhos diferentes (fotos/01-antes/censo-letra*.json).

/** Os seis degraus (px). */
export const TYPE = {
  label: 11,
  body: 13,
  title: 16,
  number: 24,
  banner: 40,
  hero: 72,
} as const
export type TypeStep = keyof typeof TYPE

/** Entrelinha de cada degrau (texto curto respira mais; letreiro fecha em 1). */
export const LEADING: Record<TypeStep, number> = { label: 1.3, body: 1.4, title: 1.2, number: 1, banner: 1, hero: 0.95 }

/**
 * Classes Tailwind de cada degrau (tamanho + entrelinha). Escritas por extenso para o
 * Tailwind achar no código. Ex.: `<span className={TX.label}>`.
 */
export const TX: Record<TypeStep, string> = {
  label: "text-[11px] leading-[1.3]",
  body: "text-[13px] leading-[1.4]",
  title: "text-[16px] leading-[1.2]",
  number: "text-[24px] leading-none",
  banner: "text-[40px] leading-none",
  hero: "text-[72px] leading-[0.95]",
}

/** Espaços (px): múltiplos de 4; a margem lateral do celular é `gutter`. */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, gutter: 16 } as const

/** Alvo mínimo do dedo (px) — botão de ícone, aba, casa da grade. */
export const TAP = 44

/** Barra de cima única (voltar · casa · título · moedas): ~6–8% de 844. */
export const TOPBAR_H = 52

/** O degrau mais perto de um tamanho solto (para migrar telas antigas sem chute). */
export function snapType(px: number): number {
  const steps = Object.values(TYPE)
  let best: number = steps[0]
  for (const s of steps) if (Math.abs(s - px) < Math.abs(best - px)) best = s
  return best
}

/** Variáveis CSS da escada, para CSS modules: `font-size: var(--mm-t-title)`. */
export const TYPE_VARS = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [`--mm-t-${k}`, `${v}px`])) as Record<`--mm-t-${TypeStep}`, string>
