"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import AgendaPageClient, { type ClanMember } from "@/components/agenda/AgendaPageClient"

export default function AgendaPage() {
  const params = useParams()
  const profileId = params.id_profile as string

  const [resolved, setResolved] = useState<{
    isClan: boolean
    clanMembers: ClanMember[]
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function detect() {
      try {
        const res = await fetch(`/api/clans/${profileId}`)
        if (!cancelled && res.ok) {
          const data = await res.json()
          const members = (data?.clan?.members ?? []) as ClanMember[]
          setResolved({ isClan: true, clanMembers: members })
          return
        }
      } catch {
        // fall through to non-clan
      }
      if (!cancelled) setResolved({ isClan: false, clanMembers: [] })
    }
    detect()
    return () => { cancelled = true }
  }, [profileId])

  if (!resolved) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-600 border-t-yellow-400" />
      </div>
    )
  }

  return (
    <AgendaPageClient
      profileId={profileId}
      isClan={resolved.isClan}
      clanMembers={resolved.clanMembers}
      backHref={resolved.isClan ? `/account/clans/${profileId}` : undefined}
    />
  )
}
