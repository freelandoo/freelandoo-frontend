"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, Home, MessageCircle, Settings, Trophy, type LucideIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useActiveContext, type ActiveContext } from "./use-active-context"

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  activePath?: string
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
      contextTag: "Sub-perfil",
      displayName: active.name || "Sub-perfil",
      avatar_url: active.avatar_url,
      items: [
        { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
        { href: "/search?machine", label: "Máquinas", icon: Boxes, activePath: "/search" },
        { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
        { href: `${root}?ranking=1`, label: "Ranking", icon: Trophy, activePath: root },
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
      contextTag: "Clan",
      displayName: active.name || "Clan",
      avatar_url: active.avatar_url,
      items: [
        { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
        { href: "/search?machine", label: "Máquinas", icon: Boxes, activePath: "/search" },
        { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
        { href: `/clans/${active.id_profile}?ranking=1`, label: "Ranking", icon: Trophy },
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
    contextTag: null,
    displayName: fallbackUserName,
    avatar_url: null,
    items: [
      { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
      { href: "/search?machine", label: "Máquinas", icon: Boxes, activePath: "/search" },
      { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
      { href: "/ranking", label: "Ranking", icon: Trophy, matchPrefix: "/ranking" },
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
    <>
      <aside
        aria-label="Toolbar do perfil"
        className={cn(
          "group/sidebar fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex",
          "w-14 flex-col gap-1 rounded-[22px] border border-white/[0.08] bg-zinc-950/75 p-1.5 shadow-[0_20px_44px_-30px_rgba(0,0,0,0.85)] backdrop-blur-xl",
          "transition-[width,background-color,border-color] duration-300 ease-out hover:w-[216px] hover:border-white/15 hover:bg-zinc-950/90"
        )}
      >
        <span
          aria-hidden
          className="absolute -right-1 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-full bg-primary/70 opacity-70 transition-opacity group-hover/sidebar:opacity-100"
        />
        <ProfileContextLink bundle={bundle} active={pathname === bundle.homeHref} />

        <div className="mx-2 my-1 h-px bg-white/[0.07]" />

        {bundle.items.map((item) => (
          <ToolbarItemLink key={item.label} item={item} pathname={pathname} />
        ))}
      </aside>

      <nav
        aria-label="Toolbar do perfil"
        className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-zinc-950/90 px-2 py-1.5 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:hidden"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <ProfileContextLink bundle={bundle} active={pathname === bundle.homeHref} compact />
        <span aria-hidden className="mx-0.5 h-7 w-px bg-white/[0.08]" />
        {bundle.items.map((item) => (
          <ToolbarItemLink key={item.label} item={item} pathname={pathname} compact />
        ))}
      </nav>
    </>
  )
}

function isItemActive(item: SidebarItem, pathname: string) {
  if (item.activePath) return pathname === item.activePath
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/")
  }
  return pathname === item.href
}

interface ProfileContextLinkProps {
  bundle: ContextBundle
  active?: boolean
  compact?: boolean
}

function ProfileContextLink({ bundle, active, compact }: ProfileContextLinkProps) {
  return (
    <Link
      href={bundle.homeHref}
      aria-label={bundle.displayName}
      title={bundle.displayName}
      className={cn(
        "relative flex h-11 items-center gap-3 overflow-hidden rounded-full px-1.5 text-sm font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/5 hover:text-white",
        compact && "h-10 w-10 justify-center px-0"
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
      {!compact && (
        <span className="min-w-0 flex-1 whitespace-nowrap pr-2 opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          {bundle.contextTag && (
            <span className="block text-[10px] font-medium uppercase tracking-normal text-white/45">
              {bundle.contextTag}
            </span>
          )}
          <span className="block truncate text-sm font-semibold leading-tight">
            {bundle.displayName}
          </span>
        </span>
      )}
    </Link>
  )
}

interface ToolbarItemLinkProps {
  item: SidebarItem
  pathname: string
  compact?: boolean
}

function ToolbarItemLink({ item, pathname, compact }: ToolbarItemLinkProps) {
  const Icon = item.icon
  const active = isItemActive(item, pathname)

  return (
    <Link
      href={item.href}
      aria-label={item.label}
      title={item.label}
      className={cn(
        "relative flex h-11 items-center gap-3 overflow-hidden rounded-full px-1.5 text-sm font-medium transition-colors",
        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
        compact && "h-10 w-10 justify-center px-0"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate whitespace-nowrap pr-2 opacity-0 transition-opacity duration-200",
          compact ? "sr-only" : "group-hover/sidebar:opacity-100"
        )}
      >
        {item.label}
      </span>
    </Link>
  )
}
