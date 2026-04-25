"use client"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Instagram, Youtube, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { MACHINES } from "@/components/home/machines/tokens"
import { buildProfileUrl } from "@/lib/slug"

interface RedeSocial {
  url: string
  social_id: string
  follower_range: string
  social_media_type: string
}

interface ProfileStatus {
  id_status: string
  desc_status: string
}

interface Creator {
  id_profile: string
  display_name: string
  bio: string
  avatar_url: string | null
  estado: string
  municipio: string
  category: string
  profession_slug?: string | null
  id_user: string
  username?: string | null
  user_nome: string
  user_avatar: string
  profile_statuses: ProfileStatus[]
  redes_sociais: RedeSocial[]
  machine_slug?: string | null
}

interface FreelancerCardProps {
  creator: Creator
  featured?: boolean
}

/** Resolve machine colors from slug */
function getMachineColors(slug: string | null | undefined) {
  if (!slug) return null
  const m = MACHINES.find((x) => x.id === slug)
  return m?.colors ?? null
}

function PlatformIcon({ platform }: { platform: string }) {
  const platformLower = platform.toLowerCase()

  if (platformLower === "instagram") {
    return <Instagram className="h-4 w-4" />
  } else if (platformLower === "youtube") {
    return <Youtube className="h-4 w-4" />
  } else if (platformLower === "tiktok") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
      </svg>
    )
  }

  return null
}

export function FreelancerCard({ creator, featured = false }: FreelancerCardProps) {
  const router = useRouter()

  const isPremium = featured || creator.profile_statuses?.some((s) => s.desc_status === "destaque_premium")
  const colors = getMachineColors(creator.machine_slug)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const ordenarFollowerRange = (a: string, b: string): number => {
    const rangeOrder = { "1K": 1, "10K": 2, "100K": 3, "1M": 4, "10M": 5 }
    const aValue = rangeOrder[a as keyof typeof rangeOrder] || 0
    const bValue = rangeOrder[b as keyof typeof rangeOrder] || 0
    return bValue - aValue
  }

  const redesOrdenadas = creator.redes_sociais?.sort((a, b) => ordenarFollowerRange(a.follower_range, b.follower_range)) || []
  const redesExibidas = redesOrdenadas.slice(0, 3)
  const redesRestantes = Math.max(0, redesOrdenadas.length - 3)

  const handleVerPerfil = () => {
    if (creator.username && creator.profession_slug) {
      router.push(
        buildProfileUrl({
          profession_slug: creator.profession_slug,
          municipio: creator.municipio,
          handle: creator.username,
        })
      )
      return
    }
    router.push(`/freelancer/${creator.id_profile}`)
  }

  // Dynamic border & glow style
  const cardStyle: React.CSSProperties = colors
    ? {
        borderColor: `${colors.accent}44`,
        boxShadow: `0 0 0 0px transparent`,
        transition: "box-shadow 0.4s ease, border-color 0.4s ease",
      }
    : {}

  const hoverHandlers = colors
    ? {
        onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
          e.currentTarget.style.boxShadow = `0 0 28px -4px ${colors.glow}, inset 0 0 0 1px ${colors.accent}66`
          e.currentTarget.style.borderColor = colors.accent
        },
        onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
          e.currentTarget.style.boxShadow = `0 0 0 0px transparent`
          e.currentTarget.style.borderColor = `${colors.accent}44`
        },
      }
    : {}

  return (
    <Card
      className={`overflow-hidden transition-all duration-300 flex flex-col ${isPremium ? "border-2" : "border"}`}
      style={{
        ...cardStyle,
        ...(isPremium && colors
          ? { borderColor: colors.accent }
          : isPremium
            ? {}
            : {}),
      }}
      data-machine={creator.machine_slug || undefined}
      {...hoverHandlers}
    >
      {isPremium && (
        <div
          className="py-1 text-center text-sm font-medium text-white"
          style={
            colors
              ? { background: `linear-gradient(90deg, ${colors.from}, ${colors.to})` }
              : { background: "var(--primary)", color: "var(--primary-foreground)" }
          }
        >
          Destaque Premium
        </div>
      )}

      <div className="relative aspect-square bg-muted flex items-center justify-center">
        {creator.avatar_url ? (
          <img
            src={creator.avatar_url}
            alt={creator.display_name}
            className="w-full h-full object-cover"
          />
        ) : creator.user_avatar ? (
          <img
            src={creator.user_avatar}
            alt={creator.user_nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: colors ? `${colors.from}33` : "var(--primary-20, rgba(230,184,0,0.2))",
              }}
            >
              <span
                className="text-4xl font-bold"
                style={{ color: colors?.accent || "var(--primary)" }}
              >
                {getInitials(creator.display_name || creator.user_nome)}
              </span>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 pb-3 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-white text-base leading-tight">{creator.display_name}</h3>
            <CheckCircle2
              className="h-4 w-4 shrink-0"
              style={{ color: colors?.accent || "var(--primary)" }}
            />
          </div>
          {creator.bio && (
            <p className="text-xs text-white/75 leading-relaxed line-clamp-2">
              {creator.bio}
            </p>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            style={
              colors
                ? { background: `${colors.from}22`, color: colors.accent, borderColor: `${colors.accent}33` }
                : undefined
            }
          >
            {creator.category}
          </Badge>
          <span className="text-xs text-muted-foreground">{creator.municipio}, {creator.estado}</span>
        </div>

        <div className="space-y-2">
          {creator.redes_sociais && creator.redes_sociais.length > 0 ? (
            <div className="flex items-flex-start gap-4 justify-center">
              {redesExibidas.map((rede) => (
                <div key={rede.social_id} className="flex flex-col items-center gap-1">
                  <a
                    href={rede.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors"
                    style={{ color: undefined }}
                    title={rede.social_media_type}
                    onMouseEnter={(e) => {
                      if (colors) e.currentTarget.style.color = colors.accent
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = ""
                    }}
                  >
                    <PlatformIcon platform={rede.social_media_type} />
                  </a>
                  <Badge variant="outline" className="text-xs">
                    {rede.follower_range}
                  </Badge>
                </div>
              ))}
              {redesRestantes > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-default transition-colors"
                    style={{ borderColor: colors?.accent || undefined, color: colors?.accent || undefined }}
                    title={`+${redesRestantes} rede${redesRestantes > 1 ? 's' : ''}`}
                  >
                    <Plus className="h-3 w-3" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{redesRestantes}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center">Sem redes cadastradas</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleVerPerfil}
          className="w-full py-2 rounded-lg font-medium mt-auto transition-all duration-300 text-white"
          style={
            colors
              ? {
                  background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
                  boxShadow: `0 4px 14px -4px ${colors.glow}`,
                }
              : {
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }
          }
          onMouseEnter={(e) => {
            if (colors) {
              e.currentTarget.style.boxShadow = `0 6px 20px -2px ${colors.glow}`
              e.currentTarget.style.transform = "translateY(-1px)"
            }
          }}
          onMouseLeave={(e) => {
            if (colors) {
              e.currentTarget.style.boxShadow = `0 4px 14px -4px ${colors.glow}`
              e.currentTarget.style.transform = "translateY(0)"
            }
          }}
        >
          Ver Perfil
        </button>
      </div>
    </Card>
  )
}
