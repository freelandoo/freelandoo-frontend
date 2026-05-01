import { permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { buildProfileUrl } from "@/lib/slug"
import FreelancerProfileView from "./_components/freelancer-profile-view"

interface ProfileById {
  id_profile: string
  username?: string | null
  profession_slug?: string | null
  sub_profile_slug?: string | null
  municipio?: string | null
  is_visible?: boolean
  is_paid?: boolean
  deleted_at?: string | null
}

async function fetchProfile(id: string): Promise<ProfileById | null> {
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/profile/${encodeURIComponent(id)}`,
      { method: "GET", cache: "no-store" }
    )
    if (!res.ok) return null
    const data = await res.json()
    return (data.profile ?? data) as ProfileById
  } catch {
    return null
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Gerenciar Perfil | Freelandoo",
    robots: { index: false, follow: false },
  }
}

export default async function FreelancerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch SSR para decidir se redireciona para a URL canônica.
  const profile = await fetchProfile(id)

  // Perfil publicado → 301 para URL canônica /[profession]/[city]/@[handle]
  // (preserva backlinks antigos). Perfil não publicado ou sem handle/slug
  // continua acessível por id (necessário para o owner ver o próprio perfil
  // antes de pagar/publicar).
  if (
    profile &&
    profile.is_paid &&
    profile.is_visible &&
    !profile.deleted_at &&
    profile.username &&
    profile.profession_slug
  ) {
    permanentRedirect(
      buildProfileUrl({
        profession_slug: profile.profession_slug,
        municipio: profile.municipio,
        handle: profile.username,
        sub_profile_slug: profile.sub_profile_slug ?? null,
      })
    )
  }

  return <FreelancerProfileView profileId={id} />
}
