// features/meu-mundo/ui/opening/hero.ts — quem está jogando, para as telas da costura
// (apresentação 13): a página grava assim que o servidor responde; o cartão de
// carregamento (character-card.tsx) lê sem precisar descer por props em cada cena.

import { useSyncExternalStore } from "react"
import type { BodyId } from "../../types"

export interface Hero {
  name: string
  body: BodyId
}

let hero: Hero | null = null
const subs = new Set<() => void>()

export function setHero(h: Hero | null) {
  if (h && hero && h.name === hero.name && h.body === hero.body) return
  hero = h
  for (const f of subs) f()
}

function subscribe(f: () => void) {
  subs.add(f)
  return () => {
    subs.delete(f)
  }
}

export function useHero(): Hero | null {
  return useSyncExternalStore(
    subscribe,
    () => hero,
    () => null,
  )
}
