import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { stripHandlePrefix, buildProfileUrl } from "@/lib/slug"

type RouteParams = { profession: string; city: string; handle: string }

interface PublicProfileResponse {
  profile: {
    id_profile: string
    username: string | null
    profession_slug: string
    sub_profile_slug: string
    municipio: string | null
    is_published: boolean
  }
}

/**
 * Rota legada de 3 segmentos. Resolve o perfil canônico (mais recente)
 * daquele usuário na categoria e redireciona 301 para a URL canônica de 4
 * segmentos `/[profession]/[city]/[@handle]/[subProfile]`.
 */
async function fetchProfile(
  handleRaw: string,
  professionRaw: string
): Promise<PublicProfileResponse["profile"] | null> {
  const handle = stripHandlePrefix(decodeURIComponent(handleRaw))
  const profession = decodeURIComponent(professionRaw)
  if (!handle || !profession) return null

  const url = `${getBackendApiUrl()}/public/creator/${encodeURIComponent(
    handle
  )}/${encodeURIComponent(profession)}`

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as PublicProfileResponse
    return data.profile ?? null
  } catch {
    return null
  }
}

function isValidHandleParam(raw: string): boolean {
  const decoded = decodeURIComponent(raw)
  return /^@?[a-z0-9][a-z0-9_.]{2,29}$/i.test(decoded)
}

export async function generateMetadata(): Promise<Metadata> {
  // A página sempre redireciona; não exporta metadata útil.
  return { title: "Perfil · Freelandoo", robots: { index: false, follow: true } }
}

export default async function PublicProfileLegacyPage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { profession, handle } = await params
  if (!isValidHandleParam(handle)) notFound()

  const profile = await fetchProfile(handle, profession)
  if (!profile) notFound()
  if (!profile.is_published) notFound()

  permanentRedirect(
    buildProfileUrl({
      profession_slug: profile.profession_slug,
      municipio: profile.municipio,
      handle: profile.username || stripHandlePrefix(handle),
      sub_profile_slug: profile.sub_profile_slug,
    })
  )
}
