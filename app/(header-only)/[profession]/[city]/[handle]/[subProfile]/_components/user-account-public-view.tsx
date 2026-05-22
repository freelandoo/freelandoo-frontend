import Link from "next/link"
import { getBackendApiUrl } from "@/lib/backend"
import { BookOpen, ImageIcon, Layers3, MapPin, MessageCircle, Shield, Sparkles } from "lucide-react"
import { UserAccountPortfolioTabs } from "./user-account-portfolio-tabs"

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
  feed_kind?: "feed" | "bees"
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
    banner_url?: string | null
    banner_thumb_url?: string | null
    tag_label?: string | null
    tag_color?: string | null
    tag_icon?: string | null
  } | null
}

type Course = {
  id: string
  title: string
  slug: string | null
  short_description: string | null
  cover_url: string | null
  price_cents: number | null
  published_at: string | null
}

type AccountSummary = {
  profiles_count: number
  clans_count: number
  courses: Course[]
}

const emptySummary: AccountSummary = {
  profiles_count: 0,
  clans_count: 0,
  courses: [],
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

async function fetchAccountSummary(handle: string | null): Promise<AccountSummary> {
  if (!handle) return emptySummary
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/public/users/${encodeURIComponent(handle)}/account-summary`,
      { cache: "no-store" }
    )
    if (!res.ok) return emptySummary
    const data = await res.json()
    return {
      profiles_count: Number(data.profiles_count || 0),
      clans_count: Number(data.clans_count || 0),
      courses: Array.isArray(data.courses) ? data.courses : [],
    }
  } catch {
    return emptySummary
  }
}

function getInitials(name: string) {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
}

function formatPrice(priceCents: number | null) {
  if (!priceCents || priceCents <= 0) return "Gratuito"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(priceCents / 100)
}

export async function UserAccountPublicView({ profile }: { profile: Profile }) {
  const [items, summary] = await Promise.all([
    fetchPortfolio(profile.id_profile),
    fetchAccountSummary(profile.username),
  ])
  const location = [profile.municipio, profile.estado].filter(Boolean).join(", ")
  const bannerUrl = profile.manifestation?.banner_url || profile.manifestation?.banner_thumb_url || null
  const courses = summary.courses

  return (
    <div className="bg-background min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <section className="mb-10 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div className="relative h-40 bg-muted md:h-52">
            {bannerUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.22),transparent_32%),linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background)))]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            {profile.manifestation?.tag_label && (
              <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-amber-200/70 bg-background/85 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {profile.manifestation.tag_label}
              </div>
            )}
          </div>

          <div className="px-5 pb-6 md:px-7">
            <div className="-mt-12 flex flex-col items-center gap-4 text-center md:flex-row md:items-end md:gap-6 md:text-left">
              <div className="relative flex aspect-[4/5] w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border-4 border-background bg-primary/10 ring-1 ring-border md:w-28">
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

              <div className="min-w-0 flex-1 pb-1">
                <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                  {profile.display_name}
                </h1>
                {profile.username && (
                  <p className="mt-0.5 text-sm text-muted-foreground">@{profile.username}</p>
                )}
                {location && (
                  <span className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </span>
                )}
              </div>

              <Link
                href={`/mensagens?with=${encodeURIComponent(profile.id_profile)}`}
                aria-label={`Enviar mensagem para ${profile.display_name}`}
                title="Enviar mensagem"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-primary/10 hover:text-primary"
              >
                <MessageCircle className="h-4 w-4" />
              </Link>
            </div>

            {profile.bio && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            )}

            <div className="mt-6 grid grid-cols-3 divide-x divide-border rounded-xl border border-border/70 bg-background/70">
              <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <Layers3 className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Perfis</span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{summary.profiles_count}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Clans</span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{summary.clans_count}</p>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground md:justify-start">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Cursos</span>
                </div>
                <p className="mt-2 text-2xl font-semibold">{courses.length}</p>
              </div>
            </div>
          </div>
        </section>

        <UserAccountPortfolioTabs items={items} />

        {courses.length > 0 && (
          <section className="mb-14">
            <div className="mb-5 flex items-center justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold tracking-wide uppercase text-muted-foreground">
                  Meus cursos
                </h2>
              </div>
            </div>

            <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="group overflow-hidden bg-card transition duration-300 hover:-translate-y-0.5"
                >
                  <div className="flex h-full flex-col">
                    <div className="aspect-[4/5] bg-muted">
                      {course.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={course.cover_url}
                          alt={course.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-col justify-between p-2 md:p-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-xs font-semibold leading-snug md:text-sm">
                          {course.title}
                        </h3>
                        {course.short_description && (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground md:text-xs">
                            {course.short_description}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-medium text-muted-foreground md:text-[10px]">
                          Publicado
                        </span>
                        <span className="text-[11px] font-semibold text-foreground md:text-sm">
                          {formatPrice(course.price_cents)}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default UserAccountPublicView
