"use client"

// features/meu-mundo/ui/statue/statue-store.ts — lore v2 N3: a corrida das estátuas na tela.
//
// Uma fonte só para o placar Raposas × Vampiros: a leitura HTTP (`GET /estatua`,
// com a minha carteira e se estou na estátua) e as atualizações ao vivo, que
// chegam pelo socket (`mm:statue`, lib/realtime.ts) e pela sala do jogo
// (`statue`, engine/net.ts → `pushStatueWire`). Quem calcula é o servidor.

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"
import { getStatueRace, type StatueClan, type StatueRace } from "../../data"
import type { StatueWire, StatueWireSide } from "../../types"

let race: StatueRace | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

const isSide = (x: unknown): x is StatueWireSide =>
  !!x && typeof (x as StatueWireSide).d === "number" && typeof (x as StatueWireSide).g === "number" && typeof (x as StatueWireSide).s === "number"

/** O estado inteiro (resposta do servidor). */
export function setStatueRace(r: StatueRace | null) {
  race = r
  emit()
}

/** Atualização ao vivo (socket ou sala): só os números da corrida do mesmo domingo. */
export function pushStatueWire(raw: unknown) {
  const w = raw as StatueWire | null
  if (!w || typeof w.week !== "string" || !isSide(w.raposa) || !isSide(w.vampiro)) return
  if (!race || race.week !== w.week) return
  const next = { ...race, race: { ...race.race } }
  for (const clan of ["raposa", "vampiro"] as StatueClan[]) {
    const s = w[clan]
    next.race[clan] = { ...race.race[clan], deliveredMl: s.d, goalMl: s.g, stage: s.s, fullAt: s.f ? race.race[clan].fullAt || new Date().toISOString() : null }
  }
  race = next
  emit()
}

/** O estado no formato da cena (para acender a estátua). */
export function wireOf(r: StatueRace | null): StatueWire | null {
  if (!r) return null
  const side = (c: StatueClan) => ({ d: r.race[c].deliveredMl, g: r.race[c].goalMl, s: r.race[c].stage, f: !!r.race[c].fullAt })
  return { week: r.week, raposa: side("raposa"), vampiro: side("vampiro") }
}

/** Busca de novo no servidor. */
export async function refreshStatueRace() {
  const token = getToken()
  if (!token) return
  const r = await getStatueRace(token)
  if (r.ok) setStatueRace(r.data)
}

/** A corrida das estátuas, ao vivo. Busca uma vez ao montar e escuta o socket. */
export function useStatueRace() {
  const r = useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => {
        subs.delete(f)
      }
    },
    () => race,
    () => null,
  )
  useEffect(() => {
    void refreshStatueRace()
    return onRealtime("mm:statue", pushStatueWire)
  }, [])
  const refresh = useCallback(() => refreshStatueRace(), [])
  return { race: r, refresh }
}
