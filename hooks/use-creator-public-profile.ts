"use client"

import { useEffect, useState } from "react"
import type { FreelancerProfile, PortfolioItem } from "@/lib/types/freelancer-profile"
import { fetchWithLog } from "@/lib/fetch-with-log"

export type ClanMemberSummary = {
  id_member_profile: string
  id_user: string
  role: "owner" | "member"
  display_name: string
  avatar_url: string | null
  username: string
}

type Options = { kind?: "profile" | "clan" }

/** Perfil público (creator ou clan) + portfólio; detecta se o visitante é o dono (`/api/users/me`). */
export function useCreatorPublicProfile(profileId: string, options: Options = {}) {
  const kind = options.kind ?? "profile"
  const [profile, setProfile] = useState<FreelancerProfile | null>(null)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [members, setMembers] = useState<ClanMemberSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    const storedToken = localStorage.getItem("token")

    if (!profileId) {
      setLoading(false)
      return
    }

    const mapClanToProfile = (clan: Record<string, unknown> & {
      members?: ClanMemberSummary[]
    }): FreelancerProfile => {
      const ownerMember = (clan.members ?? []).find((m) => m.role === "owner")
      const now = new Date().toISOString()
      return {
        id_profile: String(clan.id_profile ?? profileId),
        id_user: ownerMember?.id_user ?? "",
        username: (clan.username as string | null | undefined) ?? null,
        id_category: 0,
        desc_category: "Clan",
        profession_slug: null,
        machine_slug: (clan.machine_slug as string | null | undefined) ?? null,
        machine_name: (clan.machine_name as string | null | undefined) ?? null,
        display_name: (clan.display_name as string) ?? "",
        bio: ((clan.bio as string | null | undefined) ?? "") || "",
        avatar_url: (clan.avatar_url as string | null | undefined) ?? null,
        user_avatar: null,
        is_active: true,
        is_visible: true,
        is_paid: true,
        is_published: true,
        deleted_at: null,
        created_at: now,
        updated_at: now,
        estado: ((clan.estado as string | null | undefined) ?? "") || "",
        municipio: ((clan.municipio as string | null | undefined) ?? "") || "",
        subcategories: [],
        statuses: [],
        social_media: [],
      }
    }

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const url =
          kind === "clan"
            ? `/api/public/clans/${profileId}`
            : `/api/profile/${profileId}`
        const response = await fetchWithLog(`useCreatorPublicProfile:${kind}`, url)

        if (!response.ok) throw new Error(kind === "clan" ? "Clan não encontrado" : "Perfil não encontrado")

        const data = await response.json()
        let p: FreelancerProfile
        if (kind === "clan") {
          const clanData = data.clan ?? data
          p = mapClanToProfile(clanData)
          setMembers(clanData.members ?? [])
        } else {
          p = data.profile ?? data
        }
        setProfile(p)

        if (storedToken && p.id_user) {
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
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        const res = await fetchWithLog(
          "useCreatorPublicProfile:portfolio",
          `/api/profile/${profileId}/portfolio`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
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
  }, [profileId, kind])

  return {
    profile,
    setProfile,
    portfolioItems,
    setPortfolioItems,
    members,
    loading,
    error,
    isOwnProfile,
  }
}
