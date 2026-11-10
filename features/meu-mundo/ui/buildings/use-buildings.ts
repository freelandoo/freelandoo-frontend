"use client"

// features/meu-mundo/ui/buildings/use-buildings.ts — lore v2 F6: o estado dos
// prédios (nível do treinador, se passa direto, missões de prédio) para desenhar
// o cadeado. Recarrega quando o treinador sobe ou a missão muda. Quem recusa de
// verdade é o servidor; isto só evita a viagem até a porta fechada.

import { useCallback, useEffect, useState } from "react"
import { getToken } from "@/lib/auth"
import { QUEST_CHANGED, TRAINER_CHANGED, getBuildings } from "../../data"
import type { BuildingsState } from "../../buildings"
import TEXT from "./buildings-text.json"

type T = (k: string, f: string) => string
const PT: Record<string, string[]> = TEXT
/** Texto com o pt do JSON de fallback (a chave é a mesma do merge). */
export const bldTx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)

export function useBuildings(): [BuildingsState | null, () => void] {
  const [state, setState] = useState<BuildingsState | null>(null)
  const load = useCallback(() => {
    const tk = getToken()
    if (!tk) return
    void getBuildings(tk).then((r) => {
      if (r.ok) setState(r.data)
    })
  }, [])
  useEffect(() => {
    load()
    window.addEventListener(TRAINER_CHANGED, load)
    window.addEventListener(QUEST_CHANGED, load)
    return () => {
      window.removeEventListener(TRAINER_CHANGED, load)
      window.removeEventListener(QUEST_CHANGED, load)
    }
  }, [load])
  return [state, load]
}
