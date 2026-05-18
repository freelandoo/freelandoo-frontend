"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { PerfilCompleto } from "@/lib/types/account"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"

// CRITICAL PATH — perfil é o que destrava a tela. Tem que responder rápido
// ou falhar rápido, nunca pendurar. Cupom e mídia são acessórios e podem
// chegar depois sem bloquear o render principal.
const PROFILE_TIMEOUT_MS = 8000
const EXTRA_TIMEOUT_MS = 6000

/** Carrega `/api/users/me` (crítico) + cupom + mídia (acessórios, em paralelo). */
export function useMeProfile() {
  const router = useRouter()
  const pathname = usePathname()
  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        router.push("/login")
        return
      }

      // 1) /api/users/me — bloqueia o render. Timeout duro: 8s.
      let baseProfile: PerfilCompleto | null = null
      try {
        const response = await clientFetchWithTimeout(
          "/api/users/me",
          { headers: { Authorization: `Bearer ${token}` } },
          PROFILE_TIMEOUT_MS
        )

        if (response.status === 401) {
          localStorage.removeItem("token")
          localStorage.removeItem("user")
          router.push("/login")
          return
        }
        if (!response.ok) throw new Error("Erro ao carregar perfil")

        baseProfile = (await response.json()) as PerfilCompleto

        if (baseProfile && baseProfile.ativo === false && pathname !== "/verify-email") {
          router.push("/verify-email")
          return
        }

        if (cancelled) return
        setPerfil(baseProfile)
      } catch (e) {
        if (cancelled) return
        console.error("[useMeProfile] perfil falhou:", e)
        setError("Não foi possível carregar seu perfil")
      } finally {
        if (!cancelled) setIsLoading(false)
      }

      if (cancelled || !baseProfile) return

      // 2) Cupom e mídia em paralelo. NÃO bloqueia o render. Se falharem
      // o usuário ainda vê o perfil base.
      void (async () => {
        try {
          const couponRes = await clientFetchWithTimeout(
            "/api/users/me/coupon",
            { headers: { Authorization: `Bearer ${token}` } },
            EXTRA_TIMEOUT_MS
          )
          if (cancelled) return
          if (couponRes.ok) {
            const couponData = await couponRes.json().catch(() => null)
            const couponCode =
              couponData?.data?.[0]?.code ??
              couponData?.coupon_code ??
              couponData?.code ??
              couponData?.coupon
            if (couponCode) {
              setPerfil((prev) => (prev ? { ...prev, coupon_code: couponCode } : prev))
            }
          }
        } catch {
          /* cupom é acessório */
        }
      })()

      void (async () => {
        try {
          const mediaResponse = await clientFetchWithTimeout(
            "/api/media",
            { headers: { Authorization: `Bearer ${token}` } },
            EXTRA_TIMEOUT_MS
          )
          if (cancelled) return
          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json().catch(() => null)
            if (mediaData) {
              setPerfil((prev) => (prev ? { ...prev, media: mediaData } : prev))
            }
          }
        } catch {
          /* mídia é acessório */
        }
      })()
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [router, pathname])

  return { perfil, setPerfil, isLoading, error }
}
