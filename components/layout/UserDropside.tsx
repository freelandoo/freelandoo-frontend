"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import {
  Edit3,
  Briefcase,
  MessageSquarePlus,
  PackageSearch,
  Coins,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ManifestationBadge } from "@/components/manifestation/ManifestationBadge"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"
import { CountrySwitcher } from "@/components/i18n/CountrySwitcher"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Props = {
  open: boolean
  onClose: () => void
  user: {
    nome?: string
    email?: string
    is_admin?: boolean
    roles?: { desc_role?: string }[]
  } | null
  unreadServiceRequest?: boolean
  onLogout: () => void
}

type Action = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: React.ReactNode
  description?: string
  highlight?: boolean
}

export function UserDropside({ open, onClose, user, unreadServiceRequest, onLogout }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const tNav = useTranslations("Navigation")
  const tAcc = useTranslations("Account")
  const tCommon = useTranslations("Common")

  useEffect(() => {
    setMounted(true)
  }, [])

  // ESC fecha
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  // Trava o scroll do body enquanto aberto
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted) return null

  const actions: Action[] = [
    {
      href: "/account?edit=1",
      label: tAcc("editLabel", "Editar"),
      icon: Edit3,
      description: tAcc("editDescription", "Atualize seus dados e verifique sua conta"),
    },
    {
      href: "/manifestacao",
      label: tAcc("manifestationLabel", "Manifestação"),
      icon: () => <span className="h-4 w-4" aria-hidden />,
      badge: <ManifestationBadge label={tAcc("premiumBadge", "Premium")} size="sm" />,
      description: tAcc("manifestationDescription", "Banner premium + tag dourada no seu username"),
      highlight: true,
    },
    {
      href: "/account/afiliado",
      label: tAcc("earningsLabel", "Meus Faturamentos"),
      icon: Briefcase,
      description: tAcc("earningsDescription", "Vendas de cursos, serviços, loja e comissões"),
    },
    {
      href: "/pedir-servico",
      label: tAcc("requestServiceLabel", "Pedir serviço"),
      icon: MessageSquarePlus,
      badge: unreadServiceRequest ? (
        <span className="h-2 w-2 rounded-full bg-red-500" aria-label={tAcc("newRepliesAria", "Novas respostas")} />
      ) : undefined,
      description: tAcc("requestServiceDescription", "Solicite orçamento dos profissionais"),
    },
    {
      href: "/pedir-produto",
      label: tAcc("requestProductLabel", "Pedir produto"),
      icon: PackageSearch,
      description: tAcc("requestProductDescription", "Encontre vendedores compatíveis pela categoria e cidade"),
    },
    {
      href: "/loja-polens",
      label: tAcc("polenLabel", "Seus Pólens"),
      icon: Coins,
      description: tAcc("polenDescription", "Saldo, loja e histórico"),
    },
  ]

  const isAdmin =
    user?.is_admin || user?.roles?.some((r) => r.desc_role === "Administrator")

  const node = (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[100] transition-opacity duration-300",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
      />

      {/* Painel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu da conta"
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 shadow-[-20px_0_60px_-20px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
            {user?.nome ? user.nome.slice(0, 1).toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.nome || tAcc("accountFallback", "Conta")}</p>
            {user?.email && (
              <p className="truncate text-[11px] text-white/45">{user.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tAcc("closeMenu", "Fechar")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Ações primárias */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {tAcc("actionsHeading", "Ações")}
          </p>
          <ul className="space-y-1.5">
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    onClick={onClose}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-3 transition",
                      "hover:border-primary/30 hover:bg-primary/[0.06]",
                      a.highlight && "border-amber-400/20 bg-gradient-to-r from-amber-400/[0.06] to-amber-400/[0.02] hover:border-amber-300/35 hover:from-amber-400/[0.10]",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/8 bg-black/40 text-white/80 transition group-hover:text-primary",
                        a.highlight && "border-amber-300/30 bg-amber-300/10 text-amber-200 group-hover:text-amber-100",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-white">{a.label}</span>
                        {a.badge}
                      </span>
                      {a.description && (
                        <span className="mt-0.5 block text-[11px] text-white/45">
                          {a.description}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/70" />
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Ações secundárias */}
          <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {tAcc("myAccount", "Conta")}
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/account"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Briefcase className="h-4 w-4 text-white/45" />
                {tNav("account", "Minha conta")}
              </Link>
            </li>
            <li>
              <Link
                href="/pagamentos"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
              >
                <CreditCard className="h-4 w-4 text-white/45" />
                {tAcc("paymentsAndActivations", "Pagamentos & Ativações")}
              </Link>
            </li>
            <li>
              <Link
                href="/account/dados"
                onClick={onClose}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
              >
                <Settings className="h-4 w-4 text-white/45" />
                {tCommon("settings", "Configurações")}
              </Link>
            </li>
            {isAdmin && (
              <li>
                <button
                  type="button"
                  onClick={() => { onClose(); router.push("/admin") }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <Shield className="h-4 w-4 text-white/45" />
                  {tNav("admin", "Administração")}
                </button>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => { onClose(); onLogout() }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="h-4 w-4" />
                {tNav("logout", "Sair")}
              </button>
            </li>
          </ul>

          {/* Preferências de idioma e país */}
          <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {tAcc("preferences", "Preferências")}
          </p>
          <div className="flex items-center gap-2 px-2 py-1">
            <CountrySwitcher variant="full" />
            <LanguageSwitcher variant="full" />
          </div>
        </nav>
      </aside>
    </div>
  )

  return createPortal(node, document.body)
}

export default UserDropside
