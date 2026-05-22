"use client"

import { useEffect, useRef } from "react"

// Heartbeat global de tempo online — conta o tempo enquanto o usuário
// está logado e com a aba visível em QUALQUER página. Antes, o heartbeat
// só rodava dentro do modal de Engajamento — por isso o XP de tempo
// online não acumulava na navegação normal.
//
// O backend (`/ranking/heartbeat`) soma `minutes` ao user_online_time do
// dia (respeitando o teto admin em xp_settings.max_online_minutes) e
// concede XP de tempo online proporcional aos minutos efetivamente
// aplicados (unit_count = applied delta, não 1 fixo).

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 min — equilíbrio entre
// precisão de contagem e volume de requests (≈12 chamadas/h/usuário).
const HEARTBEAT_MINUTES = 5 // minutos somados por chamada

export function OnlineHeartbeat() {
  const lastSentRef = useRef<number>(0)

  useEffect(() => {
    const send = () => {
      if (document.visibilityState !== "visible") return
      const token = window.localStorage.getItem("token")
      if (!token) return
      // Trava local: nunca envia mais frequente que ~5 min (anti-corrida).
      const now = Date.now()
      if (now - lastSentRef.current < HEARTBEAT_INTERVAL_MS - 5_000) return
      lastSentRef.current = now
      fetch("/api/ranking/heartbeat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes: HEARTBEAT_MINUTES }),
      }).catch(() => {})
    }

    // Primeiro tick 30s após o mount — evita corrida com hidratação/auth
    // e desperdiçar request em quem só abre e fecha em segundos.
    const initialTimer = window.setTimeout(send, 30_000)
    const intervalTimer = window.setInterval(send, HEARTBEAT_INTERVAL_MS)

    // Volta da aba escondida ⇒ tenta enviar (a trava local respeita o
    // intervalo mínimo, então não bombardeia).
    const onVisibility = () => {
      if (document.visibilityState === "visible") send()
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      window.clearTimeout(initialTimer)
      window.clearInterval(intervalTimer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return null
}
