"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Boxes, Crown, Hexagon, Home, MessageCircle, Trophy, type LucideIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useActiveContext, type ActiveContext } from "./use-active-context"
import { UserDropside } from "./UserDropside"
import { useNavCounts } from "@/components/navigation/use-nav-counts"

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  activePath?: string
  matchPrefix?: string
  accent?: boolean
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
  user: { nome?: string | null; avatar?: string | null }
): ContextBundle {
  // O link e a foto do user são FIXOS no /account — não mudam por contexto.
  // Apenas os itens secundários (Ranking, Configurações) seguem o contexto ativo.
  const userBundle = {
    homeHref: "/account",
    contextTag: null as null,
    displayName: user.nome || "Perfil",
    avatar_url: user.avatar || null,
  }

  if (active.kind === "subprofile" && active.id_profile) {
    const root = `/account/profile/${active.id_profile}`
    return {
      ...userBundle,
      items: [
        { href: "/feed", label: "Feed", icon: Home, matchPrefix: "/feed" },
        { href: "/bees", label: "Bees", icon: Hexagon, matchPrefix: "/bees" },
        { href: "/search?machine", label: "Enxames", icon: Boxes, activePath: "/search" },
        { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
        { href: `${root}?ranking=1`, label: "Ranking", icon: Trophy, activePath: root },
      ],
    }
  }
  if (active.kind === "clan" && active.id_profile) {
    return {
      ...userBundle,
      items: [
        { href: "/feed", label: "Feed", icon: Home, matchPrefix: "/feed" },
        { href: "/bees", label: "Bees", icon: Hexagon, matchPrefix: "/bees" },
        { href: "/search?machine", label: "Enxames", icon: Boxes, activePath: "/search" },
        { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
        { href: `/clans/${active.id_profile}?ranking=1`, label: "Ranking", icon: Trophy },
      ],
    }
  }
  // Default: user
  return {
    ...userBundle,
    items: [
      { href: "/feed", label: "Feed", icon: Home, matchPrefix: "/feed" },
      { href: "/bees", label: "Bees", icon: Hexagon, matchPrefix: "/bees" },
      { href: "/search?machine", label: "Enxames", icon: Boxes, activePath: "/search" },
      { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
      { href: "/ranking", label: "Ranking", icon: Trophy, matchPrefix: "/ranking" },
    ],
  }
}

export function ProfileSidebar() {
  const { user, status, logout } = useAuth()
  const pathname = usePathname() || "/"
  const router = useRouter()
  const active = useActiveContext()
  const [dropsideOpen, setDropsideOpen] = useState(false)
  const navCounts = useNavCounts()

  // Em /account o avatar abre o dropside; em outras telas, navega pra /account.
  const isOnAccountHome = pathname === "/account"
  const handleTriggerClick = () => {
    if (isOnAccountHome) {
      setDropsideOpen(true)
    } else {
      router.push("/account")
    }
  }

  const isLoggedIn = status === "authenticated" && !!user

  const unreadSR = navCounts.serviceHasNew || navCounts.serviceUnread > 0

  if (HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null
  }
  if (!isLoggedIn) return null

  const bundle = buildContextBundle(active, user)

  const isAdmin =
    !!user.is_admin ||
    !!user.roles?.some((r) => r.desc_role === "Administrator")
  const items: SidebarItem[] = isAdmin
    ? [
        ...bundle.items,
        {
          href: "/admin",
          label: "Administração",
          icon: Crown,
          matchPrefix: "/admin",
          accent: true,
        },
      ]
    : bundle.items

  return (
    <>
      <aside
        aria-label="Toolbar do perfil"
        className={cn(
          "group/sidebar fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex",
          "w-14 flex-col gap-1 rounded-[22px] border border-white/10 bg-transparent p-1.5 shadow-none",
          "transition-[width,background-color,border-color] duration-300 ease-out",
          "hover:w-[216px] hover:border-white/20 hover:bg-zinc-950/55 hover:backdrop-blur-xl"
        )}
      >
        <span
          aria-hidden
          className="absolute -right-1 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-full bg-primary/40 opacity-50 transition-opacity group-hover/sidebar:opacity-100"
        />
        <ProfileTriggerButton
          bundle={bundle}
          onClick={handleTriggerClick}
          unread={unreadSR}
        />

        <div className="mx-2 my-1 h-px bg-white/[0.07]" />

        {items.map((item) => (
          <ToolbarItemLink key={item.label} item={item} pathname={pathname} />
        ))}
      </aside>

      <nav
        aria-label="Toolbar do perfil"
        className="fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-transparent px-2 py-1.5 shadow-none md:hidden"
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <ProfileTriggerButton
          bundle={bundle}
          onClick={handleTriggerClick}
          unread={unreadSR}
          compact
        />
        <span aria-hidden className="mx-0.5 h-7 w-px bg-white/[0.08]" />
        {items.map((item) => (
          <ToolbarItemLink key={item.label} item={item} pathname={pathname} compact />
        ))}
      </nav>

      <UserDropside
        open={dropsideOpen}
        onClose={() => setDropsideOpen(false)}
        user={user}
        unreadServiceRequest={unreadSR}
        onLogout={logout}
      />
    </>
  )
}

interface ProfileTriggerButtonProps {
  bundle: ContextBundle
  onClick: () => void
  unread?: boolean
  compact?: boolean
}

function ProfileTriggerButton({ bundle, onClick, unread, compact }: ProfileTriggerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Menu de ${bundle.displayName}`}
      title="Abrir menu da conta"
      className={cn(
        "relative flex h-11 items-center gap-3 overflow-hidden rounded-full px-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-primary/10 hover:text-primary",
        compact && "h-10 w-10 justify-center px-0"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Avatar className="h-8 w-8 ring-1 ring-primary/30">
          {bundle.avatar_url && (
            <AvatarImage src={bundle.avatar_url} alt={bundle.displayName} />
          )}
          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
            {getInitials(bundle.displayName)}
          </AvatarFallback>
        </Avatar>
      </span>
      {!compact && (
        <span className="min-w-0 flex-1 whitespace-nowrap pr-2 text-left opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
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
      {unread && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-950" />
      )}
    </button>
  )
}

function isItemActive(item: SidebarItem, pathname: string) {
  if (item.activePath) return pathname === item.activePath
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/")
  }
  return pathname === item.href
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
        active
          ? item.accent
            ? "bg-primary/15 text-primary"
            : "bg-white/10 text-white"
          : item.accent
            ? "text-primary hover:bg-primary/10"
            : "text-white/70 hover:bg-white/5 hover:text-white",
        compact && "h-10 w-10 justify-center px-0"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon
          className={cn("h-[18px] w-[18px]", item.accent && "text-primary")}
        />
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
