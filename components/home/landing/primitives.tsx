/**
 * Freelandoo Landing — primitivos de design (presentacionais, sem hooks).
 *
 * Reutilizáveis em toda a homepage editorial. Sem "use client": são puros e
 * podem renderizar tanto em server quanto dentro de componentes client.
 * Itens com animação/contagem ficam em PageCounter.tsx (client).
 */
import Link from "next/link"
import type { ReactNode, CSSProperties, HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

/* ── Grifo amarelo (marca-texto) ──────────────────────────────────────────── */
export function YellowHighlight({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn("fl-highlight font-extrabold", className)}>{children}</span>
}

/* ── Seta rabiscada (doodle) ───────────────────────────────────────────────
   `dir` aponta a curva. Decorativa: aria-hidden. */
export function DoodleArrow({
  className,
  dir = "right",
  style,
}: {
  className?: string
  dir?: "right" | "left" | "down" | "down-right"
  style?: CSSProperties
}) {
  const rotate = { right: 0, left: 180, down: 90, "down-right": 35 }[dir]
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 60"
      className={cn("pointer-events-none", className)}
      style={{ transform: `rotate(${rotate}deg)`, ...style }}
      fill="none"
    >
      <path
        d="M4 38 C 30 10, 64 8, 100 26"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M100 26 L 84 16 M100 26 L 86 40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ── Doodle de colmeia/abelha (sutil, decorativo) ─────────────────────────── */
export function HiveDoodle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 100 100" className={cn("pointer-events-none", className)} style={style}>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <polygon points="50,6 78,22 78,54 50,70 22,54 22,22" />
        <polygon points="50,30 64,38 64,54 50,62 36,54 36,38" />
      </g>
    </svg>
  )
}

/* Padrão de favo de mel em background (camada decorativa) */
export function HoneycombField({ className, opacity = 0.06 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cg fill='none' stroke='%2314110B' stroke-width='2'%3E%3Cpolygon points='28,2 54,16 54,46 28,60 2,46 2,16'/%3E%3Cpolygon points='28,52 54,66 54,96 28,110 2,96 2,66'/%3E%3C/g%3E%3C/svg%3E\")",
        backgroundSize: "56px 100px",
      }}
    />
  )
}

/* ── Textura de papel (camada de fundo) ───────────────────────────────────── */
export function PaperTexture({ className }: { className?: string }) {
  return <div aria-hidden className={cn("pointer-events-none absolute inset-0 fl-grain opacity-[0.05]", className)} />
}

/* ── Card de papel rasgado ─────────────────────────────────────────────────
   `variant` escolhe o recorte. Tem leve rotação para energia editorial. */
export function TornPaperCard({
  children,
  className,
  variant = "soft",
  rotate = 0,
  style,
  ...rest
}: {
  children: ReactNode
  className?: string
  variant?: "1" | "2" | "soft"
  rotate?: number
} & HTMLAttributes<HTMLDivElement>) {
  const clip = variant === "1" ? "fl-torn-1" : variant === "2" ? "fl-torn-2" : "fl-torn-soft"
  return (
    <div
      className={cn("fl-card", clip, className)}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }}
      {...rest}
    >
      {children}
    </div>
  )
}

/* ── Card de UI flutuante (mock de notificação/widget) ────────────────────── */
export function FloatingUICard({
  children,
  className,
  float = "fl-float",
  rotate = 0,
  style,
}: {
  children: ReactNode
  className?: string
  float?: "fl-float" | "fl-float-slow" | false
  rotate?: number
  style?: CSSProperties
}) {
  return (
    <div className={cn(float || "", "")} style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <div
        className={cn(
          "fl-card rounded-2xl px-4 py-3 text-left",
          className,
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  )
}

/* ── Badge / sticker ──────────────────────────────────────────────────────── */
export function Badge({
  children,
  className,
  tone = "ink",
}: {
  children: ReactNode
  className?: string
  tone?: "ink" | "gold" | "paper"
}) {
  const tones = {
    ink: "bg-[#14110B] text-[#FAF7F0]",
    gold: "bg-[#F2B705] text-[#1A1505]",
    paper: "bg-white text-[#14110B] border border-[#14110B]/10",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* Sticker rotacionado tipo adesivo (numeração / selo) */
export function Sticker({
  children,
  className,
  rotate = -6,
}: {
  children: ReactNode
  className?: string
  rotate?: number
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[#F2B705] px-3 py-1 text-sm font-black text-[#1A1505] shadow-[0_6px_16px_-8px_rgba(230,168,0,0.9)]",
        className,
      )}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  )
}

/* ── Contador de página estático (deck: "03 / 10") ────────────────────────── */
export function DeckCounter({ current, total, className }: { current: number; total: number; className?: string }) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <div className={cn("flex items-baseline gap-1 font-mono tabular-nums", className)}>
      <span className="text-2xl font-black">{pad(current)}</span>
      <span className="text-sm text-[#6B6457]">/ {pad(total)}</span>
    </div>
  )
}

/* ── Botões ───────────────────────────────────────────────────────────────── */
export function GoldButton({
  href,
  children,
  className,
  onClick,
  type,
}: {
  href?: string
  children: ReactNode
  className?: string
  onClick?: () => void
  type?: "button" | "submit"
}) {
  const cls = cn(
    "fl-btn-gold inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold sm:text-base",
    className,
  )
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <button type={type ?? "button"} onClick={onClick} className={cls}>{children}</button>
}

export function InkButton({
  href,
  children,
  className,
  onClick,
}: {
  href?: string
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const cls = cn(
    "fl-btn-ink inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold sm:text-base",
    className,
  )
  if (href) return <Link href={href} className={cls}>{children}</Link>
  return <button type="button" onClick={onClick} className={cls}>{children}</button>
}

/* Botão outline discreto */
export function GhostButton({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-[#14110B]/20 bg-white/60 px-6 py-3 text-sm font-bold text-[#14110B] transition hover:border-[#14110B]/40 hover:bg-white sm:text-base",
        className,
      )}
    >
      {children}
    </Link>
  )
}

/* ── Cabeçalho de seção (kicker + headline gigante) ───────────────────────── */
export function SectionHeading({
  kicker,
  children,
  className,
  align = "left",
}: {
  kicker?: ReactNode
  children: ReactNode
  className?: string
  align?: "left" | "center"
}) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      {kicker ? (
        <div className={cn("mb-4", align === "center" && "flex justify-center")}>
          <Badge tone="gold">{kicker}</Badge>
        </div>
      ) : null}
      <h2 className="fl-display text-4xl font-black sm:text-5xl md:text-6xl">{children}</h2>
    </div>
  )
}

/* Wrapper de seção padrão (largura + respiro editorial) */
export function Section({
  children,
  className,
  id,
}: {
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <section id={id} className={cn("relative w-full px-5 py-20 sm:px-8 md:py-28", className)}>
      <div className="mx-auto w-full max-w-[1200px]">{children}</div>
    </section>
  )
}
