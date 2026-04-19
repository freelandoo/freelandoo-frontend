"use client"

import { useEffect, useState } from "react"
import type { FreelancerProfile, PortfolioItem } from "@/lib/types/freelancer-profile"
import { fetchWithLog } from "@/lib/fetch-with-log"

/** Perfil público de creator + portfólio; detecta se o visitante é o dono (`/api/users/me`). */
export function useCreatorPublicProfile(profileId: string) {
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")

    if (!profileId) {
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchWithLog("useCreatorPublicProfile:creator", `/api/creator/${profileId}`)

        if (!response.ok) throw new Error("Perfil não encontrado")

        const data = await response.json()
        const p: FreelancerProfile = data.profile ?? data
        setProfile(p)

        if (storedToken) {
          try {
            const meResponse = await fetchWithLog("useCreatorPublicProfile:me", `/api/users/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            })
            if (meResponse.ok) {
              const meData = await meResponse.json()
              setIsOwnProfile(meData.id_user === p.id_user)
            }
          } catch {
            // silencioso
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar perfil")
      } finally {
        setLoading(false)
      }
    }

    const fetchPortfolio = async () => {
      try {
        const res = await fetchWithLog(
          "useCreatorPublicProfile:portfolio",
          `/api/profile/${profileId}/portfolio`
        )
        if (res.ok) {
          const data = await res.json()
          const items = Array.isArray(data) ? data : (data.items ?? data.portfolio ?? [])
          setPortfolioItems(items)
        }
      } catch {
        // silencioso
      }
    }

    fetchProfile()
    fetchPortfolio()
  }, [profileId])

  return {
    profile,
    setProfile,
    portfolioItems,
    setPortfolioItems,
    loading,
    error,
    isOwnProfile,
  }
}
