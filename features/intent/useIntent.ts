"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { chooseIntent, dismissIntent, fetchIntentStatus } from "./intentApi"
import type { ChosenPath, DismissReason, IntentStatus } from "./types"

const PUBLIC_PATHS = new Set([
  "/login",
  "/cadastro",
  "/verify-email",
  "/activate",
  "/reset-password",
  "/forgot-password",
])

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return true
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith("/p/")) return true
  if (pathname.startsWith("/freelancer/")) return true
  if (pathname.startsWith("/cursos/")) return true
  if (pathname === "/") return true
  return false
}

// Só dispara após a pessoa ter passado pelo BirthdateGate (data_nascimento
// preenchida em /me). Se ainda não, o modal não aparece — espera o gate
// parental resolver primeiro.
async function isAgeGateResolved(): Promise<boolean> {
  if (typeof window === "undefined") return false
  const token = window.localStorage.getItem("token")
  if (!token) return false
  try {
    const res = await fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return false
    const me = await res.json()
    return !!me?.data_nascimento || !!me?.idade
  } catch {
    return false
  }
}

interface UseIntentResult {
  status: IntentStatus | null
  shouldShow: boolean
  working: boolean
  chosen: ChosenPath | null
  onDismiss: (reason: DismissReason) => Promise<void>
  onChoose: (pathKey: string) => Promise<ChosenPath | null>
  closeVideo: () => void
}

export function useIntent(): UseIntentResult {
  const pathname = usePathname()
  const [status, setStatus] = useState<IntentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [ageReady, setAgeReady] = useState(false)
  const [working, setWorking] = useState(false)
  const [forceClosed, setForceClosed] = useState(false)
  const [chosen, setChosen] = useState<ChosenPath | null>(null)

  const publicPath = isPublicPath(pathname)

  const refresh = useCallback(async () => {
    if (publicPath) {
      setStatus(null)
      setLoading(false)
      return
    }
    const ready = await isAgeGateResolved()
    setAgeReady(ready)
    if (!ready) {
      setLoading(false)
      return
    }
    const data = await fetchIntentStatus()
    setStatus(data)
    setLoading(false)
  }, [publicPath])

  useEffect(() => {
    setLoading(true)
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onAuth = () => {
      setLoading(true)
      setForceClosed(false)
      setChosen(null)
      void refresh()
    }
    window.addEventListener("auth:changed", onAuth)
    return () => window.removeEventListener("auth:changed", onAuth)
  }, [refresh])

  const onDismiss = useCallback(async (reason: DismissReason) => {
    setWorking(true)
    try {
      const ok = await dismissIntent(reason)
      if (ok) {
        setForceClosed(true)
        setStatus((prev) => prev
          ? { ...prev, state: { ...prev.state, dismissed: true } }
          : prev)
      }
    } finally {
      setWorking(false)
    }
  }, [])

  const onChoose = useCallback(async (pathKey: string): Promise<ChosenPath | null> => {
    setWorking(true)
    try {
      const picked = await chooseIntent(pathKey)
      if (picked) {
        setForceClosed(true)
        setStatus((prev) => prev
          ? {
              ...prev,
              state: {
                ...prev.state,
                dismissed: true,
                selected_path_key: pathKey,
              },
            }
          : prev)
        setChosen(picked)
      }
      return picked
    } finally {
      setWorking(false)
    }
  }, [])

  const closeVideo = useCallback(() => setChosen(null), [])

  const shouldShow =
    !loading &&
    !publicPath &&
    ageReady &&
    !forceClosed &&
    !!status &&
    !status.state.dismissed &&
    status.paths.length > 0

  return { status, shouldShow, working, chosen, onDismiss, onChoose, closeVideo }
}
