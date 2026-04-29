import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import FreelancerProfileView from "../../freelancer/[id]/_components/freelancer-profile-view"

type ClanMember = {
  id_member_profile: string
  role: "owner" | "member"
  display_name: string
  avatar_url: string | null
  username: string
}

type PublicClan = {
  id_profile: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  estado: string | null
  municipio: string | null
  machine_slug: string | null
  machine_name: string | null
  members: ClanMember[]
  members_count: number
}

async function fetchPublicClan(id: string): Promise<PublicClan | null> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/public/clans/${id}`, {
      method: "GET",
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.clan ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id_profile: string }>
}): Promise<Metadata> {
  const { id_profile } = await params
  const clan = await fetchPublicClan(id_profile)
  if (!clan) {
    return {
      title: "Clan não encontrado · Freelandoo",
      robots: { index: false, follow: false },
    }
  }
  const place =
    [clan.municipio, clan.estado].filter(Boolean).join(" — ") || "Brasil"
  return {
    title: `${clan.display_name} · Clan ${clan.machine_name ?? ""} · Freelandoo`,
    description:
      clan.bio ||
      `Clan ${clan.display_name} — ${clan.members_count} membros em ${place}.`,
  }
}

export default async function PublicClanPage({
  params,
}: {
  params: Promise<{ id_profile: string }>
}) {
  const { id_profile } = await params
  const clan = await fetchPublicClan(id_profile)
  if (!clan) notFound()

  return <FreelancerProfileView profileId={clan.id_profile} kind="clan" />
}
