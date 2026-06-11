"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import AgendaPageClient, { type ClanMember } from "@/components/agenda/AgendaPageClient"
import { LoadingState, PageShell } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"

export default function AgendaPage() {
  const params = useParams()
  const t = useTranslations("Account")
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
      <PageShell className="md:pl-[80px]">
        <div className="relative z-10 px-4 py-16">
          <LoadingState label={t("loadingAgenda", "Carregando agenda...")} />
        </div>
      </PageShell>
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
