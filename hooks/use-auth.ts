"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AuthUser,
  clearSession,
  getStoredUser,
  getToken,
  isProtectedPath,
} from "@/lib/auth"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

export interface UseAuthResult {
  user: AuthUser | null
  status: AuthStatus
  logout: () => void
}

interface CacheState {
  user: AuthUser | null
  status: AuthStatus
  fetchedAt: number
}

const STALE_MS = 5 * 60 * 1000

let sharedCache: CacheState = {
  user: null,
  status: "loading",
  fetchedAt: 0,
}
let inFlight: Promise<void> | null = null
const subscribers = new Set<(s: CacheState) => void>()

function emit() {
  for (const fn of subscribers) fn(sharedCache)
}

function setCache(next: Partial<CacheState>) {
  sharedCache = { ...sharedCache, ...next }
  emit()
}

async function validateOnce(force = false): Promise<void> {
  if (typeof window === "undefined") return
  if (inFlight && !force) return inFlight

  const token = getToken()
  if (!token) {
    setCache({ user: null, status: "unauthenticated", fetchedAt: Date.now() })
    return
  }

  // Trust localStorage cache immediately — só revalida em background.
  const cached = getStoredUser()
  if (cached) {
    setCache({ user: cached, status: "authenticated" })
  }

  // Se já validou há pouco, não dispara de novo (a não ser que force=true).
  if (!force && Date.now() - sharedCache.fetchedAt < STALE_MS && cached) {
    return
  }

  inFlight = (async () => {
    try {
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), 8000)
      let res: Response | null = null
      try {
        res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        })
      } finally {
        clearTimeout(timer)
      }

      if (!res) {
        setCache({ status: cached ? "authenticated" : "unauthenticated" })
        return
      }

      if (res.status === 401 || res.status === 403) {
        // Backend rejeitou o token — sessão de fato inválida.
        clearSession()
        setCache({ user: null, status: "unauthenticated", fetchedAt: Date.now() })
        if (isProtectedPath(window.location.pathname)) {
          window.location.replace("/login")
        }
        return
      }

      if (!res.ok) {
        // 5xx / 504 etc — não destrói a sessão; mantém cache.
        setCache({
          status: cached ? "authenticated" : "unauthenticated",
          fetchedAt: Date.now(),
        })
        return
      }

      const data = (await res.json().catch(() => null)) as AuthUser | null
      if (data && data.id_user) {
        try {
          localStorage.setItem("user", JSON.stringify(data))
        } catch {
          /* ignore */
        }
        setCache({ user: data, status: "authenticated", fetchedAt: Date.now() })
      } else {
        setCache({
          status: cached ? "authenticated" : "unauthenticated",
          fetchedAt: Date.now(),
        })
      }
    } catch {
      // Erro de rede / abort — mantém cache.
      setCache({ status: cached ? "authenticated" : "unauthenticated" })
    } finally {
      inFlight = null
    }
  })()

  return inFlight
}

let listenersStarted = false
function startListeners() {
  if (listenersStarted || typeof window === "undefined") return
  listenersStarted = true

  window.addEventListener("auth:changed", () => {
    sharedCache = {
      user: getStoredUser(),
      status: getToken() ? "authenticated" : "unauthenticated",
      fetchedAt: 0,
    }
    emit()
    void validateOnce(true)
  })

  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === "token" || e.key === "user") {
      sharedCache = {
        user: getStoredUser(),
        status: getToken() ? "authenticated" : "unauthenticated",
        fetchedAt: 0,
      }
      emit()
      void validateOnce(true)
    }
  })

  // Bootstrap inicial.
  if (getToken()) {
    sharedCache = {
      user: getStoredUser(),
      status: "authenticated",
      fetchedAt: 0,
    }
  } else {
    sharedCache = { user: null, status: "unauthenticated", fetchedAt: Date.now() }
  }
  emit()
  void validateOnce()
}

export function useAuth(): UseAuthResult {
  const [state, setState] = useState<CacheState>(sharedCache)
  const router = useRouter()

  useEffect(() => {
    startListeners()
    subscribers.add(setState)
    setState(sharedCache)
    return () => {
      subscribers.delete(setState)
    }
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setCache({ user: null, status: "unauthenticated", fetchedAt: Date.now() })
    router.push("/")
  }, [router])

  return { user: state.user, status: state.status, logout }
}
