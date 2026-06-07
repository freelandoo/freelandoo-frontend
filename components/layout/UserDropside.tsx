"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import {
  Edit3,
  Briefcase,
  MessageSquarePlus,
  Coins,
  CreditCard,
  Settings,
  Shield,
  LogOut,
  X,
  BarChart3,
  Sparkles,
  Package,
  GraduationCap,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { OpenChamadoModal, type ChamadoMode } from "@/components/search/open-chamado-modal"
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher"
import { CountrySwitcher } from "@/components/i18n/CountrySwitcher"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"

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
  highlight?: boolean
}

export function UserDropside({ open, onClose, user, unreadServiceRequest, onLogout }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const tNav = useTranslations("Navigation")
  const tAcc = useTranslations("Account")
  const tCommon = useTranslations("Common")

  // Abrir chamado (serviço / produto / curso) — mesmo fluxo das Mensagens.
  const [chamadoExpanded, setChamadoExpanded] = useState(false)
  const [chamadoOpen, setChamadoOpen] = useState(false)
  const [chamadoMode, setChamadoMode] = useState<ChamadoMode>("service")
  const startChamado = (mode: ChamadoMode) => {
    setChamadoMode(mode)
    setChamadoExpanded(false)
    onClose() // fecha a dropside; o modal abre por cima da página
    setChamadoOpen(true)
  }

  // Abre o editor de dados do usuário (modal na página /account). Se já estamos
  // em /account, trocar a query não remontaria nada — então sinalizamos por
  // evento. Em outra rota, navegamos com ?edit=1 (a /account abre no mount).
  const openAccountEdit = () => {
    onClose()
    if (typeof window !== "undefined" && window.location.pathname === "/account") {
      window.dispatchEvent(new Event("freelandoo:open-account-edit"))
    } else {
      router.push("/account?edit=1")
    }
  }

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

  // Itens acima do "Abrir chamado". ("Editar" é um botão dedicado — abre o modal
  // de edição da conta via openAccountEdit, não um link.)
  const actionsTop: Action[] = [
    {
      href: "/manifestacao",
      label: tAcc("manifestationLabel", "Manifestação"),
      icon: Sparkles,
    },
    {
      href: "/account/afiliado",
      label: tAcc("earningsLabel", "Meus Faturamentos"),
      icon: Briefcase,
    },
  ]
  // Itens abaixo do "Abrir chamado".
  const actionsBottom: Action[] = [
    {
      href: "/loja-polens",
      label: tAcc("polenLabel", "Seus Pólens"),
      icon: Coins,
    },
    {
      href: "/account/xp",
      label: tAcc("xpLabel", "Métricas"),
      icon: BarChart3,
    },
  ]

  const chamadoOptions: { mode: ChamadoMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: "service", label: tAcc("chamadoModeService", "Serviço"), icon: Briefcase },
    { mode: "product", label: tAcc("chamadoModeProduct", "Produto"), icon: Package },
    { mode: "course", label: tAcc("chamadoModeCourse", "Curso"), icon: GraduationCap },
  ]

  const isAdmin =
    user?.is_admin || user?.roles?.some((r) => r.desc_role === "Administrator")

  const renderActionLink = (a: Action) => {
    const Icon = a.icon
    const hintId: HintId | undefined =
      a.href === "/manifestacao"
        ? "dropside-manifestation"
        : a.href === "/account/afiliado"
          ? "dropside-earnings"
          : a.href === "/loja-polens"
            ? "dropside-pollens"
            : a.href.startsWith("/account?edit")
              ? "dropside-edit"
              : undefined
    const link = (
      <Link
        href={a.href}
        onClick={onClose}
        data-tour={hintId}
        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
      >
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-white/45 transition group-hover:text-white/70">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex flex-1 items-center gap-2">
          <span className="truncate font-semibold">{a.label}</span>
          {a.badge}
        </span>
      </Link>
    )
    return hintId ? (
      <HoverHint id={hintId} side="right" className="block w-full">
        {link}
      </HoverHint>
    ) : (
      link
    )
  }

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
          "absolute left-0 top-0 flex h-full w-full max-w-[420px] flex-col border-r border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 shadow-[20px_0_60px_-20px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header */}
        <header className="border-b border-white/8 px-5 py-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link href="/" onClick={onClose} className="text-lg font-black tracking-tight text-primary">
              Freelandoo
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label={tAcc("closeMenu", "Fechar")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/70 transition hover:border-white/25 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-semibold text-primary">
            {user?.nome ? user.nome.slice(0, 1).toUpperCase() : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.nome || tAcc("accountFallback", "Conta")}</p>
            {user?.email && (
              <p className="truncate text-[11px] text-white/45">{user.email}</p>
            )}
          </div>
          </div>
        </header>

        {/* Ações primárias */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {tAcc("actionsHeading", "Ações")}
          </p>
          <ul className="space-y-1.5">
            {/* Editar — abre o modal de edição da conta (não é link) */}
            <li>
              <HoverHint id="dropside-edit" side="right" className="block w-full">
                <button
                  type="button"
                  data-tour="dropside-edit"
                  onClick={openAccountEdit}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-white/45 transition group-hover:text-white/70">
                    <Edit3 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate font-semibold">{tAcc("editLabel", "Editar")}</span>
                </button>
              </HoverHint>
            </li>

            {actionsTop.map((a) => (
              <li key={a.href}>{renderActionLink(a)}</li>
            ))}

            {/* Abrir chamado — expande em Serviço / Produto / Curso e abre o modal */}
            <li>
              <HoverHint id="dropside-open-chamado" side="right" className="block w-full">
                <button
                  type="button"
                  data-tour="dropside-open-chamado"
                  onClick={() => setChamadoExpanded((v) => !v)}
                  aria-expanded={chamadoExpanded}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-white/45 transition group-hover:text-white/70">
                    <MessageSquarePlus className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex flex-1 items-center gap-2">
                    <span className="truncate font-semibold">{tAcc("openChamadoLabel", "Abrir chamado")}</span>
                    {unreadServiceRequest && (
                      <span className="h-2 w-2 rounded-full bg-red-500" aria-label={tAcc("newRepliesAria", "Novas respostas")} />
                    )}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/40 transition", chamadoExpanded && "rotate-180")} />
                </button>
              </HoverHint>
              {chamadoExpanded && (
                <ul className="mb-1 ml-7 mt-1 space-y-1 border-l border-white/10 pl-3">
                  {chamadoOptions.map((opt) => {
                    const OptIcon = opt.icon
                    return (
                      <li key={opt.mode}>
                        <button
                          type="button"
                          onClick={() => startChamado(opt.mode)}
                          className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] text-white/70 transition hover:bg-white/[0.04] hover:text-white"
                        >
                          <OptIcon className="h-3.5 w-3.5 shrink-0 text-white/40 transition group-hover:text-amber-300" />
                          <span className="truncate">{opt.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>

            {actionsBottom.map((a) => (
              <li key={a.href}>{renderActionLink(a)}</li>
            ))}
          </ul>

          {/* Ações secundárias */}
          <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {tAcc("myAccount", "Conta")}
          </p>
          <ul className="space-y-1">
            <li>
              <HoverHint id="dropside-payments" side="right" className="block w-full">
                <Link
                  href="/pagamentos"
                  onClick={onClose}
                  data-tour="dropside-payments"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <CreditCard className="h-4 w-4 text-white/45" />
                  {tAcc("paymentsAndActivations", "Pagamentos & Ativações")}
                </Link>
              </HoverHint>
            </li>
            <li>
              <HoverHint id="dropside-settings" side="right" className="block w-full">
                <Link
                  href="/account/dados"
                  onClick={onClose}
                  data-tour="dropside-settings"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <Settings className="h-4 w-4 text-white/45" />
                  {tCommon("settings", "Configurações")}
                </Link>
              </HoverHint>
            </li>
            {isAdmin && (
              <li>
                <HoverHint id="dropside-admin" side="right" className="block w-full">
                  <button
                    type="button"
                    onClick={() => { onClose(); router.push("/admin") }}
                    data-tour="dropside-admin"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-white/80 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <Shield className="h-4 w-4 text-white/45" />
                    {tNav("admin", "Administração")}
                  </button>
                </HoverHint>
              </li>
            )}
            <li>
              <HoverHint id="dropside-logout" side="top" className="block w-full">
                <button
                  type="button"
                  onClick={() => { onClose(); onLogout() }}
                  data-tour="dropside-logout"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  {tNav("logout", "Sair")}
                </button>
              </HoverHint>
            </li>
          </ul>

          {/* Preferências de idioma e país */}
          <p className="mt-6 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
            {tAcc("preferences", "Preferências")}
          </p>
          <div className="flex items-center gap-2 px-2 py-1" data-tour="dropside-preferences">
            <HoverHint id="dropside-country" side="top">
              <CountrySwitcher variant="full" />
            </HoverHint>
            <HoverHint id="dropside-language" side="top">
              <LanguageSwitcher variant="full" />
            </HoverHint>
          </div>
        </nav>
      </aside>
    </div>
  )

  return createPortal(
    <>
      {node}
      <OpenChamadoModal open={chamadoOpen} onOpenChange={setChamadoOpen} mode={chamadoMode} />
    </>,
    document.body,
  )
}

export default UserDropside
