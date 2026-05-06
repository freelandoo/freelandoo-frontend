"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Settings, Trophy, type LucideIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useActiveContext, type ActiveContext } from "./use-active-context"

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  matchPrefix?: string
}

const HIDDEN_ON_PATHS = [
  "/login",
  "/cadastro",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/confirmar-email",
  "/activate",
]

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

interface ContextBundle {
  /** Destino quando o user clica na foto. */
  homeHref: string
  /** Texto do contexto (mostrado expandido). */
  contextLabel: string
  /** Itens do toolbar. */
  items: SidebarItem[]
  /** Display name (subperfil/clan) ou nome do user. */
  displayName: string
  /** URL do avatar quando disponível. */
  avatar_url: string | null
  /** Tag mostrada acima do nome quando contexto != user. */
  contextTag: string | null
}

function buildContextBundle(
  active: ActiveContext,
  fallbackUserName: string
): ContextBundle {
  if (active.kind === "subprofile" && active.id_profile) {
    const root = `/account/profile/${active.id_profile}`
    return {
      homeHref: root,
      contextLabel: "Sub-perfil",
      contextTag: "Sub-perfil",
      displayName: active.name || "Sub-perfil",
      avatar_url: active.avatar_url,
      items: [
        { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
        { href: root, label: "Ranking", icon: Trophy },
        {
          href: `${root}/settings`,
          label: "Configurações",
          icon: Settings,
          matchPrefix: `${root}/settings`,
        },
      ],
    }
  }
  if (active.kind === "clan" && active.id_profile) {
    const root = `/account/clans/${active.id_profile}`
    return {
      homeHref: root,
      contextLabel: "Clan",
      contextTag: "Clan",
      displayName: active.name || "Clan",
      avatar_url: active.avatar_url,
      items: [
        { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
        { href: root, label: "Ranking", icon: Trophy },
        {
          href: `${root}/edit`,
          label: "Configurações",
          icon: Settings,
          matchPrefix: `${root}/edit`,
        },
      ],
    }
  }
  // Default: user
  return {
    homeHref: "/account",
    contextLabel: "Sua conta",
    contextTag: null,
    displayName: fallbackUserName,
    avatar_url: null,
    items: [
      { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
      { href: "/account", label: "Ranking", icon: Trophy },
      {
        href: "/account/dados",
        label: "Configurações",
        icon: Settings,
        matchPrefix: "/account/dados",
      },
    ],
  }
}

export function ProfileSidebar() {
  const { user, status } = useAuth()
  const pathname = usePathname() || "/"
  const active = useActiveContext()

  if (HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null
  }
  if (status !== "authenticated" || !user) return null

  const bundle = buildContextBundle(active, user.nome || "Perfil")

  return (
    <aside
      aria-label="Toolbar do perfil"
      className={cn(
        "group/sidebar fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex",
        "flex-col gap-1 rounded-2xl border border-white/10 bg-zinc-950/85 p-2 shadow-[0_24px_48px_-32px_rgba(0,0,0,0.9)] backdrop-blur",
        "transition-[width,padding] duration-300 ease-out",
        "w-[60px] hover:w-[220px]"
      )}
    >
      <Link
        href={bundle.homeHref}
        aria-label={bundle.displayName}
        title={bundle.displayName}
        className={cn(
          "relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-2 text-sm font-medium transition-colors",
          pathname === bundle.homeHref
            ? "bg-white/10 text-white"
            : "text-white/80 hover:bg-white/5 hover:text-white"
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <Avatar className="h-8 w-8 ring-1 ring-white/15">
            {bundle.avatar_url && (
              <AvatarImage src={bundle.avatar_url} alt={bundle.displayName} />
            )}
            <AvatarFallback className="bg-white/5 text-[11px] font-semibold text-white/85">
              {getInitials(bundle.displayName)}
            </AvatarFallback>
          </Avatar>
        </span>
        <span className="min-w-0 flex-1 whitespace-nowrap pr-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          {bundle.contextTag && (
            <span className="block text-[10px] font-medium uppercase tracking-wider text-white/45">
              {bundle.contextTag}
            </span>
          )}
          <span className="block truncate text-sm font-semibold leading-tight">
            {bundle.displayName}
          </span>
        </span>
      </Link>

      <div className="my-1 h-px bg-white/[0.06]" />

      {bundle.items.map((item) => {
        const Icon = item.icon
        const isActive = item.matchPrefix
          ? pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/")
          : pathname === item.href
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className={cn(
              "relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 truncate whitespace-nowrap pr-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
              {item.label}
            </span>
          </Link>
        )
      })}
    </aside>
  )
}
