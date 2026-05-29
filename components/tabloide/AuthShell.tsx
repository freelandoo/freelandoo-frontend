/**
 * AuthShell — casca editorial das páginas de autenticação (login, cadastro,
 * recuperar/redefinir senha) no estilo tabloide.
 *
 * Split em telas grandes: painel de marca à esquerda (canvas escuro, headline,
 * provas sociais, doodles) + cartão de papel à direita com o formulário. Em
 * telas pequenas mostra só um logo compacto acima do cartão.
 *
 * Presentacional e sem hooks (server-safe). As páginas passam as strings já
 * traduzidas (i18n) por props.
 */
import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { PageShell } from "./kit"
import {
  YellowHighlight,
  HiveDoodle,
  Halftone,
  DoodleArrow,
  AvatarStack,
} from "@/components/home/landing/primitives"

function BrandAside({
  eyebrow,
  title,
  highlight,
  subtitle,
  bullets = [],
  socialProof,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  highlight?: ReactNode
  subtitle?: ReactNode
  bullets?: ReactNode[]
  socialProof?: ReactNode
}) {
  return (
    <aside className="relative hidden overflow-hidden bg-[#15120E] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
      <HiveDoodle className="absolute -right-8 -top-8 h-44 w-44 text-[#F2B705]/10" />
      <Halftone className="absolute bottom-10 left-8 h-24 w-32 opacity-[0.14]" />

      <Link href="/" className="relative flex items-center gap-2" aria-label="Freelandoo">
        <Image src="/freelandoo-logo.png" alt="Freelandoo" width={200} height={56} className="h-8 w-auto" priority />
        <span className="text-xl font-black text-[#F5F1E8]">freelandoo</span>
      </Link>

      <div className="relative max-w-md">
        {eyebrow && (
          <div className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">{eyebrow}</div>
        )}
        <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] xl:text-5xl">
          {title} {highlight && <YellowHighlight mark>{highlight}</YellowHighlight>}
        </h1>
        {subtitle && <p className="mt-5 max-w-sm text-base leading-relaxed text-[#C9C2B6]">{subtitle}</p>}
        {bullets.length > 0 && (
          <ul className="mt-7 space-y-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-[#E8E2D4]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F2B705] text-[#1A1505]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <DoodleArrow dir="down-right" className="mt-6 hidden h-9 w-20 text-[#F2B705]/70 xl:block" />
      </div>

      <div className="relative flex items-center gap-3">
        {socialProof ?? (
          <>
            <AvatarStack count={5} />
            <span className="text-sm text-[#9A938A]">Milhares já estão na colmeia.</span>
          </>
        )}
      </div>
    </aside>
  )
}

export function AuthShell({
  eyebrow,
  asideTitle,
  asideHighlight,
  asideSubtitle,
  bullets,
  socialProof,
  children,
}: {
  eyebrow?: ReactNode
  asideTitle: ReactNode
  asideHighlight?: ReactNode
  asideSubtitle?: ReactNode
  bullets?: ReactNode[]
  socialProof?: ReactNode
  children: ReactNode
}) {
  return (
    <PageShell className="grid lg:grid-cols-[1.05fr_1fr]">
      <BrandAside
        eyebrow={eyebrow}
        title={asideTitle}
        highlight={asideHighlight}
        subtitle={asideSubtitle}
        bullets={bullets}
        socialProof={socialProof}
      />
      <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 sm:px-8 lg:min-h-0">
        {/* Logo compacto (mobile/tablet — sem o painel de marca) */}
        <Link href="/" className="mb-7 flex items-center gap-2 lg:hidden" aria-label="Freelandoo">
          <Image src="/freelandoo-logo.png" alt="Freelandoo" width={200} height={56} className="h-7 w-auto" priority />
          <span className="text-lg font-black text-[#F5F1E8]">freelandoo</span>
        </Link>
        {children}
      </div>
    </PageShell>
  )
}

/* ── AuthCard ─────────────────────────────────────────────────────────────
   Cartão de papel com cabeçalho (badge de ícone opcional + título + subtítulo)
   onde mora o formulário. */
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
    <div className={cn("fl-card w-full max-w-md rounded-3xl p-7 sm:p-8", className)}>
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
