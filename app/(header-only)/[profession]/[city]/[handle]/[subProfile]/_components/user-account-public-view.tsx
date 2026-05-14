import { getBackendApiUrl } from "@/lib/backend"
import { ImageIcon, MapPin, Sparkles } from "lucide-react"

type Media = {
  id_portfolio_media: string
  media_url: string
  media_type: "image" | "video"
  is_active?: boolean
}

type Item = {
  id_portfolio_item: string
  title: string | null
  description: string | null
  project_url: string | null
  media: Media[]
}

type Profile = {
  id_profile: string
  display_name: string
  username: string | null
  bio: string | null
  avatar_url: string | null
  estado: string | null
  municipio: string | null
  manifestation?: {
    tag_label?: string | null
  } | null
}

async function fetchPortfolio(id_profile: string): Promise<Item[]> {
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/profile/${id_profile}/portfolio`,
      { cache: "no-store" }
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.items || []
  } catch {
    return []
  }
}

function getInitials(name: string) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

/**
 * View pública minimal de uma conta de usuário (perfil-fantasma).
 * Renderiza só header (avatar + nome + @username + bio + tag manifestação)
 * e portfólio público. SEM serviços, SEM agenda, SEM contato profissional,
 * SEM ranking — esse usuário é apenas alguém que está na plataforma, não
 * está oferecendo serviços profissionais.
 */
export async function UserAccountPublicView({ profile }: { profile: Profile }) {
  const items = await fetchPortfolio(profile.id_profile)
  const location = [profile.municipio, profile.estado].filter(Boolean).join(", ")

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* HEADER simplificado */}
        <section className="mb-10">
          <div className="flex flex-col items-center text-center gap-4 md:flex-row md:items-start md:text-left md:gap-6">
            <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full ring-1 ring-primary/30 bg-primary/10 flex items-center justify-center">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-primary">
                  {getInitials(profile.display_name)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                {profile.display_name}
              </h1>
              {profile.username && (
                <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 md:justify-start">
                {location && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </span>
                )}
                {profile.manifestation?.tag_label && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                    <Sparkles className="h-3 w-3" />
                    {profile.manifestation.tag_label}
                  </span>
                )}
              </div>
              {profile.bio && (
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground max-w-2xl">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* PORTFOLIO read-only */}
        <section className="mb-16">
          <div className="flex items-center justify-center md:justify-start mb-8">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground">
                Portfólio
              </h2>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed rounded-xl">
              <div className="h-16 w-16 rounded-full border-2 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 opacity-50" />
              </div>
              <p className="text-sm font-medium">Sem itens no portfólio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {items.map((item) => {
                const activeMedias = item.media?.filter((m) => m.is_active !== false) ?? []
                const firstMedia = activeMedias[0]
                return (
                  <div key={item.id_portfolio_item} className="group relative flex flex-col">
                    {firstMedia ? (
                      <div className="relative aspect-[4/5] bg-muted overflow-hidden md:rounded-lg border border-border/50">
                        {firstMedia.media_type === "video" ? (
                          <video
                            src={firstMedia.media_url}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            muted
                            playsInline
                            controls
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstMedia.media_url}
                            alt={item.title ?? "Mídia do portfólio"}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        )}
                        {activeMedias.length > 1 && (
                          <div className="absolute top-3 right-3">
                            <ImageIcon className="h-5 w-5 text-white drop-shadow-md opacity-90" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative aspect-[4/5] bg-muted flex items-center justify-center md:rounded-lg border border-border/50">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="pt-3 px-2 md:px-0">
                      <h3 className="font-semibold text-sm line-clamp-1">
                        {item.title || "Sem título"}
                      </h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default UserAccountPublicView
