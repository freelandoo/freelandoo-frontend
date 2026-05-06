"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Settings, Trophy, type LucideIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  /** Match exato ou prefixo para destacar item ativo. */
  matchPrefix?: string
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

const HIDDEN_ON_PATHS = ["/login", "/cadastro", "/forgot-password", "/reset-password", "/verify-email", "/confirmar-email", "/activate"]

export function ProfileSidebar() {
  const { user, status } = useAuth()
  const pathname = usePathname() || "/"

  // Esconde em rotas de auth — mesmo se a sessão ainda estiver carregando.
  if (HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null
  }
  // Sem user logado, a sidebar fica fora — header padrão já oferece login/cadastro.
  if (status !== "authenticated" || !user) return null

  const profileHref = "/account"
  const items: SidebarItem[] = [
    { href: "/explorar", label: "Explorar", icon: Home, matchPrefix: "/explorar" },
    { href: "/account", label: "Ranking", icon: Trophy, matchPrefix: "/account#ranking" },
    { href: "/account/dados", label: "Configurações", icon: Settings, matchPrefix: "/account/dados" },
  ]

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
      <SidebarLink
        href={profileHref}
        active={pathname === "/account"}
        label={user.nome || "Perfil"}
        icon={
          <Avatar className="h-8 w-8 ring-1 ring-white/15">
            <AvatarImage src={undefined} alt={user.nome || ""} />
            <AvatarFallback className="bg-white/5 text-[11px] font-semibold text-white/85">
              {getInitials(user.nome)}
            </AvatarFallback>
          </Avatar>
        }
      />

      <div className="my-1 h-px bg-white/[0.06]" />

      {items.map((item) => {
        const Icon = item.icon
        const active = item.matchPrefix
          ? pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/")
          : pathname === item.href
        return (
          <SidebarLink
            key={item.href}
            href={item.href}
            label={item.label}
            active={active}
            icon={<Icon className="h-5 w-5" />}
          />
        )
      })}
    </aside>
  )
}

interface SidebarLinkProps {
  href: string
  label: string
  active?: boolean
  icon: React.ReactNode
}

function SidebarLink({ href, label, active, icon }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">{icon}</span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate whitespace-nowrap pr-2 opacity-0 transition-opacity duration-200",
          "group-hover/sidebar:opacity-100"
        )}
      >
        {label}
      </span>
    </Link>
  )
}
