"use client"

// features/meu-mundo/ui/inbox/use-chatter.ts — quando o hóspede fala (mm3d-72).
//
// Uma fala ao entrar no jogo (alguns segundos depois, para não brigar com a
// tela de entrada), uma na virada para a noite e para o dia (hora de Brasília)
// e, fora isso, no máximo uma a cada CHATTER_GAP_MS. Só desenho: as falas
// viram cards locais (`chatterNotice`), não vão ao sino.

import { useEffect, useRef } from "react"
import type { MMNotice } from "../../types"
import type { LifeSoul } from "../../soul"
import { CHATTER_GAP_MS, brtHour, chatterLine, chatterNotice, isNight, type ChatterMoment } from "./chatter"

type Tr = (key: string, fallback: string) => string
const ENTER_DELAY_MS = 8_000
const TICK_MS = 60_000

export function useChatter(soul: LifeSoul | null, t: Tr, push: (n: MMNotice) => void) {
  const soulRef = useRef(soul)
  const tRef = useRef(t)
  const pushRef = useRef(push)
  const state = useRef({ entered: false, last: 0, hour: brtHour() })
  useEffect(() => {
    soulRef.current = soul
    tRef.current = t
    pushRef.current = push
  })
  const hasSoul = !!soul

  useEffect(() => {
    const st = state.current
    if (!hasSoul || st.entered) return
    st.entered = true
    const say = (m: ChatterMoment) => {
      const s = soulRef.current
      if (!s) return
      st.last = Date.now()
      pushRef.current(chatterNotice(chatterLine(s, m, tRef.current)))
    }
    const enter = setTimeout(() => say("enter"), ENTER_DELAY_MS)
    const tick = setInterval(() => {
      const h = brtHour()
      const prev = st.hour
      st.hour = h
      if (isNight(h) && !isNight(prev)) say("night")
      else if (!isNight(h) && isNight(prev)) say("morning")
      else if (Date.now() - st.last >= CHATTER_GAP_MS) say("idle")
    }, TICK_MS)
    return () => {
      clearTimeout(enter)
      clearInterval(tick)
      st.entered = false
    }
  }, [hasSoul])
}
