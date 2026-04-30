"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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

/**
 * Valida o token contra /api/users/me.
 * - 401/403: limpa sessão e, se em rota protegida, redireciona para /login.
 * - Erro de rede: mantém o user em cache (graceful offline).
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>("loading")
  const router = useRouter()
  const inFlightRef = useRef<AbortController | null>(null)

  const validate = useCallback(async () => {
    inFlightRef.current?.abort()
    const ctrl = new AbortController()
    inFlightRef.current = ctrl

    const token = getToken()
    if (!token) {
      setUser(null)
      setStatus("unauthenticated")
      return
    }

    const cached = getStoredUser()
    if (cached) setUser(cached)

    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      })

      if (res.status === 401 || res.status === 403) {
        clearSession()
        setUser(null)
        setStatus("unauthenticated")
        if (typeof window !== "undefined" && isProtectedPath(window.location.pathname)) {
          router.push("/login")
        }
        return
      }

      if (!res.ok) {
        setStatus(cached ? "authenticated" : "unauthenticated")
        return
      }

      const data = (await res.json()) as AuthUser
      if (data && data.id_user) {
        try {
          localStorage.setItem("user", JSON.stringify(data))
        } catch {}
        setUser(data)
        setStatus("authenticated")
      } else {
        setStatus(cached ? "authenticated" : "unauthenticated")
      }
    } catch (err) {
      if ((err as { name?: string })?.name === "AbortError") return
      setStatus(cached ? "authenticated" : "unauthenticated")
    }
  }, [router])

  useEffect(() => {
    validate()

    const onAuthChange = () => validate()
    const onStorage = (e: StorageEvent) => {
      if (e.key === "token" || e.key === "user") validate()
    }
    window.addEventListener("auth:changed", onAuthChange)
    window.addEventListener("storage", onStorage)
    return () => {
      inFlightRef.current?.abort()
      window.removeEventListener("auth:changed", onAuthChange)
      window.removeEventListener("storage", onStorage)
    }
  }, [validate])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    setStatus("unauthenticated")
    router.push("/")
  }, [router])

  return { user, status, logout }
}
