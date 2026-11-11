"use client"

// features/meu-mundo/ui/offstage.ts — um ambiente 3D por vez (regra do Alex, 2026-11-07).
//
// Bairro, centro, sala de prédio, minijogo e luta são ambientes distintos: entrou em um,
// o anterior sai da memória. A rua sai inteira (cena, tela e WebGL); só a conexão com a
// sala fica viva, porque é por ela que chegam alta do hospital, avisos e o fim do monstro.
// Na volta a rua é montada de novo com essa mesma conexão, onde a pessoa estava.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react"
import type { GameHandle, ParkedGame } from "../engine/game"
import type { NetStatus } from "../types"

/** A sala, com ou sem a rua montada. Vem antes do `useMobEncounter`. */
export function useRoomLink(gameRef: RefObject<GameHandle | null>) {
  const parked = useRef<ParkedGame | null>(null)
  const room = useRef<Pick<GameHandle, "reportMob" | "engageMob" | "reportGod">>({
    reportMob(id, win, busy = false) {
      if (gameRef.current) gameRef.current.reportMob(id, win, busy)
      else parked.current?.net.send("mfight", busy ? { id, r: 0, b: 1 } : { id, r: win ? 1 : 0 })
    },
    engageMob(id) {
      if (gameRef.current) gameRef.current.engageMob(id)
      else parked.current?.net.send("mfight", { id, s: 1 })
    },
    // lore v2 N4: o deus solto (a vitória é do servidor; aqui só derrota/ocupado)
    reportGod(god, busy = false) {
      if (gameRef.current) gameRef.current.reportGod(god, busy)
      else parked.current?.net.send("gfight", busy ? { g: god, r: 0, b: 1 } : { g: god, r: 0 })
    },
  })
  return { parked, room }
}

interface StageEvents {
  setNet: (s: NetStatus) => void
  onMessage: (type: string, payload: unknown) => void
  /** O servidor mudou a pessoa de ambiente: pede o destino novo. */
  onMoved: () => void
}

export function useOffstage(off: boolean, parkedRef: RefObject<ParkedGame | null>, events: StageEvents) {
  const offRef = useRef(off)
  const movedLater = useRef(false)
  const ev = useRef(events)
  // antes da limpeza do efeito do jogo: é ela que decide entre guardar a sala e sair
  useLayoutEffect(() => {
    offRef.current = off
    ev.current = events
  })

  /** A troca de cena desmonta tudo: com luta ou minijogo aberto, espera acabar. */
  const netStatus = useCallback((s: NetStatus) => {
    ev.current.setNet(s)
    if (s !== "moved") return
    if (offRef.current) movedLater.current = true
    else ev.current.onMoved()
  }, [])

  /** Limpeza do jogo: a rua sai; a sala só fica se a pessoa foi para outro ambiente. */
  const release = useCallback(
    (handle: GameHandle) => {
      if (!offRef.current) return handle.dispose()
      parkedRef.current = handle.detach({ onStatus: netStatus, onMessage: (type, p) => ev.current.onMessage(type, p) })
    },
    [parkedRef, netStatus],
  )

  const takeParked = useCallback(() => {
    const p = parkedRef.current
    parkedRef.current = null
    return p
  }, [parkedRef])

  useEffect(() => {
    if (off || !movedLater.current) return
    movedLater.current = false
    ev.current.onMoved()
  }, [off])

  useEffect(
    () => () => {
      parkedRef.current?.net.dispose()
      parkedRef.current = null
    },
    [parkedRef],
  )

  return useMemo(() => ({ netStatus, release, takeParked }), [netStatus, release, takeParked])
}
