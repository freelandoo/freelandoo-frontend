import type { Metadata } from "next"
import Link from "next/link"
import { getBackendApiUrl } from "@/lib/backend"
import { buildProfileUrl } from "@/lib/slug"
import { ShareWithCouponButton } from "@/components/share/share-with-coupon-button"

type PortfolioItemPublic = {
  id_portfolio_item: string
  id_profile: string
  title: string | null
  description: string | null
  project_url: string | null
  profile_display_name: string | null
  profile_username: string | null
  profession_slug: string | null
  profile_municipio: string | null
  manifestation?: {
    banner_url?: string | null
    tag_label?: string | null
    tag_color?: string | null
    tag_icon?: string | null
  } | null
  media: Array<{
    id_portfolio_media: string
    media_url: string
    media_type: string
    thumbnail_url: string | null
  }>
}

async function fetchItem(id: string): Promise<PortfolioItemPublic | null> {
  try {
    const res = await fetch(`${getBackendApiUrl()}/public/portfolio-item/${encodeURIComponent(id)}`, {
      cache: "no-store",
    })
    if (!res.ok) return null
    return (await res.json()) as PortfolioItemPublic
  } catch {
    return null
  }
}

function profileHref(item: PortfolioItemPublic): string {
  if (item.profile_username && item.profession_slug) {
    return buildProfileUrl({
      profession_slug: item.profession_slug,
      municipio: item.profile_municipio,
      handle: item.profile_username,
    }) + `?portfolio=${item.id_portfolio_item}`
  }
  return `/freelancer/${item.id_profile}?portfolio=${item.id_portfolio_item}`
}

export async function generateMetadata({
  params,
}: { params: Promise<{ itemId: string }> }): Promise<Metadata> {
  const { itemId } = await params
  const item = await fetchItem(itemId)
  if (!item) {
    return { title: "Item não encontrado | Freelandoo" }
  }
  const author = item.profile_display_name ?? "Freelancer"
  const title = item.title ? `${item.title} — ${author} | Freelandoo` : `Portfólio de ${author} | Freelandoo`
  const description = item.description ?? `Confira o portfólio de ${author} na Freelandoo.`
  const firstImage = item.media.find((m) => m.media_type !== "video")?.media_url
    ?? item.media[0]?.thumbnail_url
    ?? item.media[0]?.media_url
  const images = firstImage ? [{ url: firstImage }] : undefined

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: firstImage ? [firstImage] : undefined,
    },
  }
}

export default async function PortfolioItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>
}) {
  const { itemId } = await params
  const item = await fetchItem(itemId)

  if (!item) {
    return (
      <main className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Item não encontrado</h1>
        <p className="text-muted-foreground mt-2">Pode ter sido removido pelo profissional.</p>
        <Link href="/" className="inline-block mt-6 text-primary underline">Voltar à home</Link>
      </main>
    )
  }

  const firstMedia = item.media[0]
  const author = item.profile_display_name ?? "Freelancer"

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {item.manifestation?.banner_url && (
          <div className="relative min-h-32 overflow-hidden border-b border-border">
            <img src={item.manifestation.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/70 to-zinc-950/20" />
            <div className="relative p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Manifestacao</p>
              <p className="mt-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs backdrop-blur">
                {item.manifestation.tag_label}
              </p>
            </div>
          </div>
        )}
        {firstMedia && (
          <div className="bg-black flex items-center justify-center">
            {firstMedia.media_type === "video" ? (
              <video
                src={firstMedia.media_url}
                controls
                playsInline
                className="w-full max-h-[80vh] object-contain"
              />
            ) : (
              <img
                src={firstMedia.media_url}
                alt={item.title ?? "Portfólio"}
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        )}

        <div className="p-6 space-y-4">
          <h1 className="text-xl font-semibold">{item.title || "Portfólio"}</h1>
          {item.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
              {item.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              por <span className="font-medium text-foreground">{author}</span>
            </p>
            <div className="flex items-center gap-2">
              <ShareWithCouponButton
                path={`/p/${item.id_portfolio_item}`}
                title={item.title || author}
              />
              <Link
                href={profileHref(item)}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
              >
                Ver perfil completo
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
