"use client"

import { useEffect, useRef } from "react"

/**
 * Registra uma visita ao perfil (POST /api/ranking/visit). Fire-and-forget,
 * dispara 1x por id_profile montado. Envia o token se houver (visita logada
 * concede +1 XP de visita pro dono — dedup diário por par user+perfil no
 * backend; visita anônima só conta tráfego, sem XP).
 */
export function ProfileVisitTracker({ idProfile }: { idProfile?: string | null }) {
  const sentFor = useRef<string | null>(null)

  useEffect(() => {
    if (!idProfile || sentFor.current === idProfile) return
    sentFor.current = idProfile
    const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : null
    fetch("/api/ranking/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id_profile: idProfile }),
    }).catch(() => {})
  }, [idProfile])

  return null
}
