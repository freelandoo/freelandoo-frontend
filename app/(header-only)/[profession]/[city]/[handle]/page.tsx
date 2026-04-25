import { notFound, permanentRedirect } from "next/navigation"
import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { slugify, stripHandlePrefix, buildProfileUrl } from "@/lib/slug"
import FreelancerProfileView from "../../../freelancer/[id]/_components/freelancer-profile-view"

type RouteParams = { profession: string; city: string; handle: string }

interface PublicProfileResponse {
  profile: {
    id_profile: string
    id_user: string
    username: string | null
    id_category: number
    desc_category: string
    profession_slug: string
    machine_slug: string | null
    machine_name: string | null
    display_name: string
    bio: string | null
    avatar_url: string | null
    estado: string | null
    municipio: string | null
    is_visible: boolean
    is_paid: boolean
    is_published: boolean
    deleted_at: string | null
  }
}

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
  // Aceita "@printtei" ou "printtei" (Next decodifica %40 → @ no path).
  const decoded = decodeURIComponent(raw)
  return /^@?[a-z0-9][a-z0-9_.]{2,29}$/i.test(decoded)
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>
}): Promise<Metadata> {
  const { profession, city, handle } = await params
  if (!isValidHandleParam(handle)) return { title: "Perfil não encontrado" }

  const profile = await fetchProfile(handle, profession)
  if (!profile || !profile.is_published) {
    return {
      title: "Perfil não encontrado · Freelandoo",
      robots: { index: false, follow: false },
    }
  }

  const cityLabel = profile.municipio || ""
  const stateLabel = profile.estado || ""
  const location = [cityLabel, stateLabel].filter(Boolean).join(", ")
  const title = location
    ? `${profile.display_name} · ${profile.desc_category} em ${location} | Freelandoo`
    : `${profile.display_name} · ${profile.desc_category} | Freelandoo`
  const description =
    profile.bio?.slice(0, 160) ||
    `Conheça ${profile.display_name}, ${profile.desc_category}${
      location ? ` em ${location}` : ""
    }, no Freelandoo.`

  const canonicalPath = buildProfileUrl({
    profession_slug: profile.profession_slug,
    municipio: profile.municipio,
    handle: profile.username || stripHandlePrefix(handle),
  })

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "profile",
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  }
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<RouteParams>
}) {
  const { profession, city, handle } = await params

  if (!isValidHandleParam(handle)) notFound()

  const profile = await fetchProfile(handle, profession)
  if (!profile) notFound()

  // Não publicado → 404 (não indexável).
  if (!profile.is_published) notFound()

  // Canonicalização: se city ou profession da URL ≠ canônico atual → 301.
  const canonicalCity = slugify(profile.municipio) || "brasil"
  const canonicalProfession = profile.profession_slug
  const canonicalHandle = profile.username || stripHandlePrefix(handle)
  const requestedCity = decodeURIComponent(city)
  const requestedProfession = decodeURIComponent(profession)
  const requestedHandle = stripHandlePrefix(decodeURIComponent(handle))

  const needsRedirect =
    requestedCity !== canonicalCity ||
    requestedProfession !== canonicalProfession ||
    requestedHandle.toLowerCase() !== canonicalHandle.toLowerCase()

  const canonicalPath = buildProfileUrl({
    profession_slug: canonicalProfession,
    municipio: profile.municipio,
    handle: canonicalHandle,
  })

  if (needsRedirect) {
    permanentRedirect(canonicalPath)
  }

  const jsonLdProfile = {
    "@context": "https://schema.org",
    "@type": ["Person", "ProfessionalService"],
    name: profile.display_name,
    description: profile.bio || `Conheça ${profile.display_name}, ${profile.desc_category} no Freelandoo.`,
    image: profile.avatar_url || undefined,
    url: `https://www.freelandoo.com.br${canonicalPath}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: profile.municipio || undefined,
      addressRegion: profile.estado || undefined,
      addressCountry: "BR"
    }
  }

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.freelandoo.com.br"
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Busca",
        item: "https://www.freelandoo.com.br/search"
      },
      {
        "@type": "ListItem",
        position: 3,
        name: profile.display_name,
        item: `https://www.freelandoo.com.br${canonicalPath}`
      }
    ]
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProfile) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <FreelancerProfileView profileId={profile.id_profile} />
    </>
  )
}
