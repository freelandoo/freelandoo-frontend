/**
 * Kit tabloide compartilhado — peças de chrome reusáveis para o redesign
 * editorial (canvas escuro, papel, dourado) de todas as páginas públicas.
 *
 * ⚠️ Tokens `--fl-*` (e portanto `fl-btn-*`, `fl-card`) só existem dentro de
 * `.fl-root`. `PageShell` aplica esse escopo + a textura de papel, então tudo
 * que ele envolve pode usar os primitivos e classes `fl-*` com segurança.
 *
 * Presentacional e sem hooks — usável em server e client components.
 */
import type { ReactNode, CSSProperties } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Section,
  YellowHighlight,
  GoldButton,
  OutlineButton,
  Halftone,
  DoodleArrow,
  Spark,
  Underline,
} from "@/components/home/landing/primitives"

export const TABLOID_ACTION_CLASSES =
  "inline-flex items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B0B0D] shadow-[4px_4px_0_0_#0B0B0D] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#0B0B0D] disabled:cursor-not-allowed disabled:opacity-55"

export const TABLOID_OUTLINE_ACTION_CLASSES =
  "inline-flex items-center justify-center gap-2 border-2 border-[#F1EDE2]/30 bg-transparent px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#F1EDE2] transition hover:border-[#F1EDE2] hover:bg-[#F1EDE2]/6 disabled:cursor-not-allowed disabled:opacity-55"

export const TABLOID_PAPER_CARD_CLASSES =
  "fl-card fl-hard rounded-[6px] border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D]"

export const TABLOID_DARK_PANEL_CLASSES =
  "rounded-[6px] border-2 border-[#F1EDE2]/14 bg-[#1D1810] text-[#F1EDE2]"

/* ── PageShell ────────────────────────────────────────────────────────────
   Casca da página: estabelece o subtree `.fl-root` (resolve os tokens) + a
   textura de papel + altura mínima. Slots opcionais de header/footer para
   páginas que não herdam um layout com chrome. */
export function PageShell({
  children,
  className,
  header,
  footer,
  texture = true,
}: {
  children: ReactNode
  className?: string
  header?: ReactNode
  footer?: ReactNode
  texture?: boolean
}) {
  return (
    <div
      className={cn(
        "fl-root flex min-h-[100dvh] flex-col font-sans antialiased",
        texture && "fl-paper-texture",
        className,
      )}
    >
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  )
}

/* ── PageHero ─────────────────────────────────────────────────────────────
   Hero editorial para páginas internas: kicker (sobrancelha dourada),
   headline grande em `fl-display` com palavra destacada opcional, subtítulo e
   linha de ações. Doodle decorativo (seta) em telas grandes. */
export function PageHero({
  kicker,
  title,
  highlight,
  highlightAt = "end",
  highlightMark = true,
  subtitle,
  actions,
  align = "left",
  doodle = true,
  className,
}: {
  kicker?: ReactNode
  title: ReactNode
  /** palavra(s) destacada(s) anexada(s) ao início/fim do título */
  highlight?: ReactNode
  highlightAt?: "start" | "end"
  highlightMark?: boolean
  subtitle?: ReactNode
  actions?: ReactNode
  align?: "left" | "center"
  doodle?: boolean
  className?: string
}) {
  const centered = align === "center"
  const mark = highlight ? (
    <YellowHighlight mark={highlightMark}>{highlight}</YellowHighlight>
  ) : null

  return (
    <Section className={cn("pb-6 pt-12 sm:pt-16 md:pt-20", className)}>
      <div className={cn("relative max-w-3xl", centered && "mx-auto text-center")}>
        {kicker && (
          <div
            className={cn(
              "mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]",
            )}
          >
            {kicker}
          </div>
        )}
        <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl md:text-6xl">
          {highlight && highlightAt === "start" ? <>{mark} </> : null}
          {title}
          {highlight && highlightAt === "end" ? <> {mark}</> : null}
        </h1>
        {subtitle && (
          <p
            className={cn(
              "mt-5 text-base leading-relaxed text-[#C9C2B6] sm:text-lg",
              centered ? "mx-auto max-w-2xl" : "max-w-2xl",
            )}
          >
            {subtitle}
          </p>
        )}
        {actions && (
          <div className={cn("mt-7 flex flex-wrap gap-3", centered && "justify-center")}>
            {actions}
          </div>
        )}
        {doodle && !centered && (
          <DoodleArrow
            dir="down-right"
            className="absolute -right-2 top-2 hidden h-10 w-20 text-[#F2B705]/80 lg:block"
          />
        )}
      </div>
    </Section>
  )
}

/* ── TabloidPageIntro ─────────────────────────────────────────────────────
   Intro padrão para páginas internas que precisam parecer a referência do
   ranking: manchete amarela gigante, underline rabiscado, texto compacto e
   divisória editorial. */
export function TabloidPageIntro({
  title,
  eyebrow,
  subtitle,
  back,
  actions,
  className,
  size = "hero",
}: {
  title: ReactNode
  eyebrow?: ReactNode
  subtitle?: ReactNode
  back?: ReactNode
  actions?: ReactNode
  className?: string
  /** "hero" = manchete gigante (palavra curta). "compact" = título dinâmico/longo que quebra linha. */
  size?: "hero" | "compact"
}) {
  const compact = size === "compact"
  return (
    <header className={cn("relative border-b-2 border-[#F1EDE2]/12 pb-8", className)}>
      <Halftone className="absolute right-0 top-3 hidden h-24 w-28 opacity-[0.1] md:block" />
      {back && <div className="mb-5">{back}</div>}
      {eyebrow && (
        <p className="fl-marker mb-1 text-2xl font-bold leading-none text-[#F2B705] md:text-3xl">
          {eyebrow}
        </p>
      )}
      {compact ? (
        <div className="relative">
          <Spark className="absolute -left-4 -top-5 hidden h-7 w-7 text-[#F2B705] sm:block md:-left-7" />
          <h1 className="fl-display block max-w-3xl break-words text-4xl leading-[0.95] text-[#F2B705] sm:text-5xl md:text-[3.4rem]">
            {title}
          </h1>
          <Underline className="mt-2 h-4 w-40 text-[#F2B705]" />
        </div>
      ) : (
        <h1 className="relative inline-block">
          <span className="fl-display block text-[18vw] leading-[0.86] text-[#F2B705] sm:text-[6.8rem] md:text-[8.4rem]">
            {title}
          </span>
          <Underline className="absolute -bottom-4 left-0 h-5 w-full text-[#F2B705]" />
          <Spark className="absolute -left-4 -top-5 h-8 w-8 text-[#F2B705] md:-left-8" />
        </h1>
      )}
      {subtitle && (
        <p className={cn("max-w-2xl text-sm font-bold leading-relaxed text-[#C9C2B6] sm:text-base", compact ? "mt-6" : "mt-8")}>
          {subtitle}
        </p>
      )}
      {actions && <div className="mt-6 flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function TabloidBackLink({
  href,
  children = "Voltar",
  className,
}: {
  href: string
  children?: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  )
}

/* ── Card base para os três estados (empty/loading/error) ─────────────────── */
function StateCard({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div
      className={cn(
        "relative mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border-2 border-[#F5F1E8]/12 bg-[#1D1810] px-7 py-12 text-center",
        className,
      )}
      style={style}
    >
      <Halftone className="absolute right-4 top-4 h-12 w-16 opacity-[0.12]" />
      {children}
    </div>
  )
}

/* ── EmptyState ───────────────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <StateCard className={className}>
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F2B705]/12 text-[#F2B705]">
          {icon}
        </div>
      )}
      <h3 className="fl-display text-2xl text-[#F5F1E8]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#9A938A]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </StateCard>
  )
}

/* ── LoadingState ─────────────────────────────────────────────────────────── */
export function LoadingState({
  label = "Carregando…",
  className,
}: {
  label?: ReactNode
  className?: string
}) {
  return (
    <StateCard className={className}>
      <span
        aria-hidden
        className="mb-5 inline-block h-10 w-10 animate-spin rounded-full border-[3px] border-[#F5F1E8]/15 border-t-[#F2B705]"
      />
      <p className="fl-marker text-xl text-[#C9C2B6]">{label}</p>
      <span className="sr-only" role="status">{label}</span>
    </StateCard>
  )
}

/** Bloco de skeleton (linhas/cards) para lista carregando. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-[#F5F1E8]/8", className)} />
}

/* ── ErrorState ───────────────────────────────────────────────────────────── */
export function ErrorState({
  title = "Algo deu errado",
  description = "Não foi possível carregar. Tente novamente.",
  onRetry,
  retryLabel = "Tentar de novo",
  homeHref,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  homeHref?: string
  className?: string
}) {
  return (
    <StateCard className={cn("border-[#F2B705]/25", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F2B705]/12 text-3xl">
        ⚠️
      </div>
      <h3 className="fl-display text-2xl text-[#F5F1E8]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#9A938A]">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {onRetry && (
          <GoldButton onClick={onRetry} className="px-5 py-2.5 text-sm">
            {retryLabel}
          </GoldButton>
        )}
        {homeHref && (
          <OutlineButton href={homeHref} className="px-5 py-2.5 text-sm">
            Voltar ao início
          </OutlineButton>
        )}
      </div>
    </StateCard>
  )
}

/* ── Prose ────────────────────────────────────────────────────────────────
   Coluna de leitura para conteúdo longo (docs legais, artigos) no canvas
   tabloide. Tipografia editorial sobre fundo escuro. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl text-[#C9C2B6]",
        "[&_h2]:fl-display [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:text-[#F5F1E8]",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#F5F1E8]",
        "[&_p]:mb-4 [&_p]:leading-relaxed",
        "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
        "[&_a]:text-[#F2B705] [&_a]:underline-offset-2 hover:[&_a]:underline",
        className,
      )}
    >
      {children}
    </div>
  )
}
