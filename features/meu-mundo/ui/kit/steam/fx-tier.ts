// features/meu-mundo/ui/kit/steam/fx-tier.ts — quanto efeito a INTERFACE pode ter.
//
// Segue a escolha "Gráficos" da gaveta (engine/quality.ts): baixa = quase nada
// de efeito secundário (sem brilho que acende, sem reflexo correndo, sem
// faísca), média = brilho e transições, alta = tudo. `prefers-reduced-motion`
// força o baixo. O valor vai para `html[data-mm-fx]` e o CSS decide sozinho
// (nada de ler isso a cada quadro).

import { resolveQuality } from "../../../engine/quality"

export type UiFx = "low" | "mid" | "high"

export function uiFx(): UiFx {
  if (typeof window === "undefined") return "mid"
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return "low"
  } catch {
    /* sem matchMedia */
  }
  try {
    return resolveQuality().tier
  } catch {
    return "mid"
  }
}

/** Grava o nível no <html> (chamar ao montar o jogo e ao trocar "Gráficos"). */
export function applyUiFx(): UiFx {
  const fx = uiFx()
  if (typeof document !== "undefined") document.documentElement.dataset.mmFx = fx
  return fx
}

/** Leitura barata para quem decide em JS (quantas faíscas criar). */
export function currentUiFx(): UiFx {
  if (typeof document === "undefined") return "mid"
  const v = document.documentElement.dataset.mmFx
  return v === "low" || v === "high" || v === "mid" ? v : applyUiFx()
}
