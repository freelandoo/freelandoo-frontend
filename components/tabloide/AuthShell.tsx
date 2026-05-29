/**
 * AuthShell — casca das páginas de autenticação (login, cadastro, recuperar/
 * redefinir senha) no estilo tabloide.
 *
 * Apresenta o formulário como um MODAL centrado sobre o canvas escuro: o cartão
 * de papel fica sempre no centro do viewport (nunca empurrado para baixo), com
 * logo + headline compacta acima e doodles ambientes ao fundo.
 *
 * Presentacional e sem hooks (server-safe). As páginas passam as strings já
 * traduzidas (i18n) por props.
 */
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  YellowHighlight,
  HiveDoodle,
  Halftone,
  HoneycombField,
} from "@/components/home/landing/primitives"

export function AuthShell({
  eyebrow,
  asideTitle,
  asideHighlight,
  asideSubtitle,
  children,
}: {
  eyebrow?: ReactNode
  asideTitle?: ReactNode
  asideHighlight?: ReactNode
  asideSubtitle?: ReactNode
  /** aceitos por compatibilidade; não usados no layout modal */
  bullets?: ReactNode[]
  socialProof?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="fl-root fl-paper-texture relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-5 py-10">
      {/* Ambiente: colmeia + doodles ao fundo (decorativo) */}
      <HoneycombField opacity={0.05} />
      <HiveDoodle className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 text-[#F2B705]/10" />
      <Halftone className="pointer-events-none absolute bottom-10 left-10 h-28 w-36 opacity-[0.10]" />

      <Link href="/" className="relative mb-6 flex items-center gap-2" aria-label="Freelandoo">
        <Image src="/freelandoo-logo.png" alt="Freelandoo" width={200} height={56} className="h-8 w-auto" priority />
        <span className="text-xl font-black text-[#F5F1E8]">freelandoo</span>
      </Link>

      {(eyebrow || asideTitle) && (
        <div className="relative mb-6 max-w-md text-center">
          {eyebrow && (
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">{eyebrow}</div>
          )}
          {asideTitle && (
            <h1 className="fl-display text-3xl leading-[0.95] text-[#F5F1E8] sm:text-4xl">
              {asideTitle} {asideHighlight && <YellowHighlight mark>{asideHighlight}</YellowHighlight>}
            </h1>
          )}
          {asideSubtitle && (
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#C9C2B6]">{asideSubtitle}</p>
          )}
        </div>
      )}

      {children}
    </div>
  )
}

/* ── AuthCard ─────────────────────────────────────────────────────────────
   Cartão de papel (modal) com cabeçalho (badge de ícone opcional + título +
   subtítulo) onde mora o formulário. */
export function AuthCard({
  icon,
  iconTone = "gold",
  title,
  subtitle,
  children,
  footer,
  className,
}: {
  icon?: ReactNode
  iconTone?: "gold" | "green" | "red"
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  const toneBg = {
    gold: "bg-[#F2B705] text-[#1A1505]",
    green: "bg-[#16a34a] text-white",
    red: "bg-[#dc2626] text-white",
  }[iconTone]

  return (
    <div
      className={cn(
        "fl-card relative z-10 w-full max-w-md rounded-3xl p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.85)] sm:p-8",
        className,
      )}
    >
      <div className="mb-6 text-center">
        {icon && (
          <div className={cn("mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full", toneBg)}>
            {icon}
          </div>
        )}
        <h2 className="fl-display text-3xl text-[var(--fl-ink)]">{title}</h2>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-[#5b554b]">{subtitle}</p>}
      </div>
      {children}
      {footer && <div className="mt-6 text-center text-sm text-[#5b554b]">{footer}</div>}
    </div>
  )
}
