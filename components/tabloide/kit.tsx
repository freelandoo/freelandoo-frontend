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
import { cn } from "@/lib/utils"
import {
  Section,
  YellowHighlight,
  GoldButton,
  OutlineButton,
  Halftone,
  DoodleArrow,
} from "@/components/home/landing/primitives"

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
