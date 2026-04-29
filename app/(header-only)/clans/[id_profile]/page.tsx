import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MapPin } from "lucide-react"

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

  const place = [clan.municipio, clan.estado].filter(Boolean).join(" — ")

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="size-20 border-2 border-background shadow">
              <AvatarImage src={clan.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {clan.display_name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-2xl">{clan.display_name}</CardTitle>
                <Badge variant="default" className="uppercase tracking-wide">
                  <Users className="size-3 mr-1" /> Clan
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                {clan.machine_name && <span>{clan.machine_name}</span>}
                {place && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" /> {place}
                  </span>
                )}
                <span>
                  {clan.members_count} {clan.members_count === 1 ? "membro" : "membros"}
                </span>
              </div>
              {clan.bio && (
                <p className="text-sm mt-3 max-w-prose">{clan.bio}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Membros
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {clan.members.map((m) => (
              <Link
                key={m.id_member_profile}
                href={`/freelancer/${m.id_member_profile}`}
                className="flex flex-col items-center text-center gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors"
                title={`Ver perfil de ${m.display_name}`}
              >
                <Avatar className="size-16">
                  <AvatarImage src={m.avatar_url || undefined} />
                  <AvatarFallback>
                    {m.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 w-full">
                  <div className="text-sm font-medium truncate">
                    {m.display_name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{m.username}
                  </div>
                  {m.role === "owner" && (
                    <Badge variant="secondary" className="mt-1 text-[10px]">
                      Dono
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <ClanPublicPortfolio id_profile={clan.id_profile} />

      <ClanPublicAgendaPlaceholder />

    </main>
  )
}

async function ClanPublicPortfolio({ id_profile }: { id_profile: string }) {
  type Media = {
    id_portfolio_media: string
    media_url: string
    media_type: "image" | "video" | "file"
    thumbnail_url: string | null
  }
  type Item = {
    id_portfolio_item: string
    title: string
    description: string | null
    project_url: string | null
    media: Media[]
  }

  let items: Item[] = []
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/profile/${id_profile}/portfolio`,
      { method: "GET", cache: "no-store" }
    )
    if (res.ok) {
      const data = await res.json()
      items = (data?.items || []).filter((i: Item) => (i.media || []).length > 0)
    }
  } catch {
    // silencioso — galeria fica vazia
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfólio do clan</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            O clan ainda não publicou itens no portfólio.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((item) => {
              const cover = item.media[0]
              const isImage = cover?.media_type === "image"
              return (
                <div
                  key={item.id_portfolio_item}
                  className="rounded-md overflow-hidden border bg-muted/20"
                >
                  <div className="aspect-square bg-muted relative">
                    {isImage && cover?.media_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.media_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : cover?.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.thumbnail_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        {cover?.media_type || "—"}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium truncate">{item.title}</div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ClanPublicAgendaPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Cada membro tem sua própria agenda. Clique em um membro acima para
          agendar com ele.
        </p>
      </CardContent>
    </Card>
  )
}
