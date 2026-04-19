"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { PerfilCompleto } from "@/lib/types/account"
import { fetchWithLog } from "@/lib/fetch-with-log"

/** Carrega `/api/users/me`, cupom e mídia do portfólio global (autenticado). */
export function useMeProfile() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchPerfil = async () => {
      const token = localStorage.getItem("token")

      if (!token) {
        router.push("/login")
        return
      }

      try {
        const response = await fetchWithLog("useMeProfile:me", "/api/users/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            router.push("/login")
            return
          }
          throw new Error("Erro ao carregar perfil")
        }

        const data = await response.json()
        setPerfil(data)

        try {
          const couponRes = await fetchWithLog("useMeProfile:coupon", "/api/users/me/coupon", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (couponRes.ok) {
            const couponData = await couponRes.json()
            const couponCode =
              couponData.data?.[0]?.code ??
              couponData.coupon_code ??
              couponData.code ??
              couponData.coupon
            if (couponCode) {
              setPerfil((prev) => (prev ? { ...prev, coupon_code: couponCode } : prev))
            }
          }
        } catch {
          // silencioso
        }

        try {
          const mediaResponse = await fetchWithLog("useMeProfile:media", "/api/media", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })

          if (mediaResponse.ok) {
            const mediaData = await mediaResponse.json()
            setPerfil((prevPerfil) =>
              prevPerfil ? { ...prevPerfil, media: mediaData } : prevPerfil
            )
          }
        } catch (mediaError) {
          console.error("Erro ao carregar mídia:", mediaError)
        }
      } catch (e) {
        console.error("Erro ao carregar perfil:", e)
        setError("Não foi possível carregar seu perfil")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPerfil()
  }, [router])

  return { perfil, setPerfil, isLoading, error }
}
