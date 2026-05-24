"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import {
  dismissMonetization,
  fetchMonetizationStatus,
  selectMonetizationPath,
} from "./onboardingApi"
import type { DismissReason, MonetizationStatus } from "./types"

const PUBLIC_PATHS = new Set([
  "/login",
  "/cadastro",
  "/verify-email",
  "/activate",
  "/reset-password",
  "/forgot-password",
])

// O modal só dispara em rotas autenticadas. Mesma whitelist do BirthdateGate
// para evitar abrir em landing pública.
function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return true
  if (PUBLIC_PATHS.has(pathname)) return true
  if (pathname.startsWith("/p/")) return true
  if (pathname.startsWith("/freelancer/")) return true
  if (pathname.startsWith("/cursos/")) return true
  if (pathname === "/") return true
  return false
}

// Confirma que o usuário já passou pelo birthdate gate (data_nascimento no /me).
// Se ainda não passou, o modal de monetização espera — não disputa viewport
// com o gate parental.
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

interface UseMonetizationOnboardingResult {
  status: MonetizationStatus | null
  shouldShowModal: boolean
  loading: boolean
  dismissing: boolean
  selecting: boolean
  onDismiss: (reason: DismissReason) => Promise<void>
  onSelect: (pathKey: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useMonetizationOnboarding(): UseMonetizationOnboardingResult {
  const pathname = usePathname()
  const [status, setStatus] = useState<MonetizationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [ageReady, setAgeReady] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [forceClosed, setForceClosed] = useState(false)

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
    const data = await fetchMonetizationStatus()
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
      void refresh()
    }
    window.addEventListener("auth:changed", onAuth)
    return () => window.removeEventListener("auth:changed", onAuth)
  }, [refresh])

  const onDismiss = useCallback(async (reason: DismissReason) => {
    setDismissing(true)
    try {
      const ok = await dismissMonetization(reason)
      if (ok) {
        setForceClosed(true)
        setStatus((prev) => prev
          ? { ...prev, state: { ...prev.state, dismissed: true, dismissed_reason: reason } }
          : prev)
      }
    } finally {
      setDismissing(false)
    }
  }, [])

  const onSelect = useCallback(async (pathKey: string) => {
    setSelecting(true)
    try {
      const ok = await selectMonetizationPath(pathKey)
      if (ok) {
        setForceClosed(true)
        setStatus((prev) => prev
          ? {
              ...prev,
              state: {
                ...prev.state,
                dismissed: true,
                dismissed_reason: "closed",
                selected_path_key: pathKey,
                active_tour_path_key: pathKey,
              },
            }
          : prev)
        window.dispatchEvent(new CustomEvent("onboarding:tour-selected", { detail: { pathKey } }))
      }
    } finally {
      setSelecting(false)
    }
  }, [])

  const shouldShowModal =
    !loading &&
    !publicPath &&
    ageReady &&
    !forceClosed &&
    !!status &&
    !status.state.dismissed &&
    status.paths.length > 0

  return {
    status,
    shouldShowModal,
    loading,
    dismissing,
    selecting,
    onDismiss,
    onSelect,
    refresh,
  }
}
