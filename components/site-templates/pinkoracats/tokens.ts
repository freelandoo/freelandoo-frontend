// OS TOKENS DE MOVIMENTO — espelho, em JS, do bloco `--pk-dur-*` / `--pk-ease`
// de `theme.css`. O GSAP lê daqui; o CSS lê de lá. Mexeu num, mexe no outro.
//
// TRÊS VELOCIDADES, e é isso que impede o site de ficar todo lento:
//   fast       hover, foco, botão                       150–250ms
//   standard   card, reflexo, painel                    350–650ms
//   cinematic  abrir a caixa, takeover, grande passagem 700–1200ms
//
// UMA CURVA: cubic-bezier(.22, 1, .36, 1) — preciso, sem quique. Os verbos do
// site são OPEN, CLOSE, SLIDE, PICK UP, STACK, FOCUS, REFLECT, REVEAL; nunca
// BOUNCE, SPIN ou FLOAT RANDOMLY.

import gsap from "gsap"
import { CustomEase } from "gsap/CustomEase"

export const DUR = { fast: 0.2, standard: 0.5, cinematic: 0.95 } as const

export const EASE = "pkLux"
export const EASE_CSS = "cubic-bezier(.22, 1, .36, 1)"

let ready = false

/** Registra a curva da marca no GSAP (uma vez por página). */
export function registerEase(): string {
  if (!ready) {
    gsap.registerPlugin(CustomEase)
    CustomEase.create(EASE, "0.22,1,0.36,1")
    ready = true
  }
  return EASE
}

export type Tier = "high" | "medium" | "low"

/** O nível que `motion.tsx` decidiu para esta visita (`data-tier` na raiz). */
export function currentTier(): Tier {
  const t = document.querySelector<HTMLElement>(".tpl-pinkora")?.dataset.tier
  return t === "high" || t === "medium" || t === "low" ? t : "medium"
}

export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}
