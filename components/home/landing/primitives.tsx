/**
 * Freelandoo Landing — primitivos (tema warm-dark, estilo poster).
 * Presentacionais e sem hooks: usáveis em server e client components.
 */
import Link from "next/link"
import Image from "next/image"
import type { ReactNode, CSSProperties, HTMLAttributes } from "react"
import {
  Star, GraduationCap, ShoppingCart, Wallet, Percent, ShoppingBag, Briefcase,
  Blocks, Search, Crown, ArrowUpRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

/* Quando você soltar as fotos reais em /public/landing, mude para `true`. */
export const PHOTOS_READY = false

const ICONS = {
  star: Star, cap: GraduationCap, cart: ShoppingCart, wallet: Wallet, percent: Percent,
  bag: ShoppingBag, briefcase: Briefcase, blocks: Blocks, search: Search, crown: Crown,
} as const
export type IconKey = keyof typeof ICONS

export function Icon({ name, className }: { name?: string; className?: string }) {
  const Cmp = (name && ICONS[name as IconKey]) || Star
  return <Cmp className={className} />
}

/* ── Palavra destacada na headline ────────────────────────────────────────
   `mark` = marca-texto dourado à mão (bloco atrás). Sem mark = texto dourado. */
export function YellowHighlight({
  children, className, mark,
}: { children: ReactNode; className?: string; mark?: boolean }) {
  if (mark) {
    return (
      <span className={cn("fl-mark", className)}>
        <span className="text-[#0B0B0D]">{children}</span>
      </span>
    )
  }
  return <span className={cn("fl-highlight", className)}>{children}</span>
}

/* Marca-texto dourado genérico (para palavras no corpo) */
export function MarkerText({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("fl-mark font-bold", className)}>
      <span className="text-[#0B0B0D]">{children}</span>
    </span>
  )
}

/* Número/letra gigante em contorno (text-stroke) */
export function StrokeNumber({
  children, className, tone = "offwhite",
}: { children: ReactNode; className?: string; tone?: "offwhite" | "gold" | "ink" }) {
  const cls = tone === "gold" ? "fl-stroke-gold" : tone === "ink" ? "fl-stroke-ink" : "fl-stroke"
  return <span className={cn("fl-display", cls, className)}>{children}</span>
}

/* ── Halftone (cantos de pontos) ──────────────────────────────────────────── */
export function Halftone({ className, ink, style }: { className?: string; ink?: boolean; style?: CSSProperties }) {
  return <div aria-hidden className={cn("pointer-events-none", ink ? "fl-dots-ink" : "fl-dots", className)} style={style} />
}

/* ── Fita adesiva (washi tape) ────────────────────────────────────────────── */
export function WashiTape({ className, off, rotate = -4, style }: { className?: string; off?: boolean; rotate?: number; style?: CSSProperties }) {
  return <span aria-hidden className={cn("fl-tape", off && "fl-tape-off", className)} style={{ transform: `rotate(${rotate}deg)`, ...style }} />
}

/* ── Seta rabiscada dourada (doodle decorativo) ───────────────────────────── */
export function DoodleArrow({
  className, dir = "right", style,
}: { className?: string; dir?: "right" | "left" | "down" | "down-right" | "up-right"; style?: CSSProperties }) {
  const rotate = { right: 0, left: 180, down: 90, "down-right": 35, "up-right": -35 }[dir]
  return (
    <svg aria-hidden viewBox="0 0 120 60" className={cn("pointer-events-none", className)} style={{ transform: `rotate(${rotate}deg)`, ...style }} fill="none">
      <path d="M4 40 C 32 8, 70 8, 104 30" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M104 30 L 88 21 M104 30 L 90 44" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Rabisco/loop decorativo (squiggle) */
export function Squiggle({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 120 40" className={cn("pointer-events-none", className)} style={style} fill="none">
      <path d="M2 20 C 12 2, 24 2, 30 20 S 50 38, 58 20 S 78 2, 86 20 S 108 38, 118 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* Faísca/estrela desenhada (spark) */
export function Spark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={cn("pointer-events-none", className)} style={style} fill="none">
      <path d="M20 3 C 22 14, 26 18, 37 20 C 26 22, 22 26, 20 37 C 18 26, 14 22, 3 20 C 14 18, 18 14, 20 3 Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  )
}

/* Coroa desenhada à mão (poder/topo) */
export function DoodleCrown({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 64 44" className={cn("pointer-events-none", className)} style={style} fill="none">
      <path d="M6 38 L 10 12 L 22 28 L 32 8 L 42 28 L 54 12 L 58 38 Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M8 38 L 56 38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* Círculo rabiscado à mão (envolve um número/elemento) */
export function CircleScribble({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 120 110" className={cn("pointer-events-none", className)} style={style} fill="none">
      <path d="M70 10 C 30 6, 8 34, 14 64 C 20 96, 70 106, 98 88 C 120 73, 116 30, 84 14 C 60 2, 28 10, 18 38" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/* Sublinhado rabiscado */
export function Underline({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 200 16" className={cn("pointer-events-none", className)} style={style} fill="none" preserveAspectRatio="none">
      <path d="M3 9 C 50 3, 95 13, 140 7 C 165 4, 185 9, 197 6" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/* ── Doodle de colmeia/abelha (sutil) ─────────────────────────────────────── */
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

export function HoneycombField({ className, opacity = 0.06 }: { className?: string; opacity?: number }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        opacity,
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cg fill='none' stroke='%23F2B705' stroke-width='2'%3E%3Cpolygon points='28,2 54,16 54,46 28,60 2,46 2,16'/%3E%3Cpolygon points='28,52 54,66 54,96 28,110 2,96 2,66'/%3E%3C/g%3E%3C/svg%3E\")",
        backgroundSize: "56px 100px",
      }}
    />
  )
}

export function PaperTexture({ className }: { className?: string }) {
  return <div aria-hidden className={cn("pointer-events-none absolute inset-0 fl-grain opacity-[0.06]", className)} />
}

/* ── Foto: placeholder dourado elegante até as imagens reais entrarem ──────── */
export function PhotoFrame({
  src, alt, className, icon = "star", priority, torn, cut,
}: { src?: string; alt: string; className?: string; icon?: string; priority?: boolean; torn?: boolean; cut?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden bg-[#1D1810]", torn && "fl-torn-1", cut && "fl-cut", className)}>
      {PHOTOS_READY && src ? (
        <Image src={src} alt={alt} fill sizes="(max-width:768px) 90vw, 480px" className="object-cover" priority={priority} />
      ) : (
        <div aria-label={alt} role="img" className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: "radial-gradient(120% 100% at 70% 8%, rgba(242,183,5,0.28), transparent 52%), linear-gradient(160deg,#2a2212,#141009)" }} />
          <div aria-hidden className="absolute inset-0 fl-dots opacity-[0.12]" />
          <div aria-hidden className="absolute inset-0 fl-grain opacity-10" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon name={icon} className="h-10 w-10 text-[#F2B705]/45" />
          </div>
        </div>
      )}
    </div>
  )
}

/* Bilhete manuscrito com fita adesiva (Caveat) */
export function StickerNote({
  children, className, rotate = -3, tape = true,
}: { children: ReactNode; className?: string; rotate?: number; tape?: boolean }) {
  return (
    <div
      className={cn("relative inline-block bg-[#FBF9F2] px-4 py-2.5 text-[#0B0B0D] shadow-[0_8px_18px_-8px_rgba(0,0,0,0.6)]", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {tape && <WashiTape className="-top-3 left-1/2 -translate-x-1/2" rotate={-5} />}
      <span className="fl-marker text-xl font-bold leading-tight">{children}</span>
    </div>
  )
}

/* ── Pilha de avatares (prova social) ─────────────────────────────────────── */
export function AvatarStack({ count = 5, className }: { count?: number; className?: string }) {
  const tints = ["#F2B705", "#EC4899", "#0EA5E9", "#10B981", "#A855F7", "#F97316"]
  return (
    <div className={cn("flex -space-x-2.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#15120E] text-[11px] font-bold text-[#15120E]"
          style={{ background: tints[i % tints.length] }}
        >
          {String.fromCharCode(65 + i)}
        </span>
      ))}
    </div>
  )
}

/* ── Card de papel rasgado (mantido) ──────────────────────────────────────── */
export function TornPaperCard({
  children, className, variant = "soft", rotate = 0, style, ...rest
}: { children: ReactNode; className?: string; variant?: "1" | "2" | "soft"; rotate?: number } & HTMLAttributes<HTMLDivElement>) {
  const clip = variant === "1" ? "fl-torn-1" : variant === "2" ? "fl-torn-2" : "fl-torn-soft"
  return (
    <div className={cn("fl-card", clip, className)} style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined, ...style }} {...rest}>
      {children}
    </div>
  )
}

/* ── Card de UI flutuante (branco) ────────────────────────────────────────── */
export function FloatingUICard({
  children, className, float = "fl-float", rotate = 0, style,
}: { children: ReactNode; className?: string; float?: "fl-float" | "fl-float-slow" | false; rotate?: number; style?: CSSProperties }) {
  return (
    <div className={cn(float || "")} style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}>
      <div className={cn("fl-card rounded-2xl px-4 py-3 text-left", className)} style={style}>{children}</div>
    </div>
  )
}

/* ── Badge / sticker ──────────────────────────────────────────────────────── */
export function Badge({
  children, className, tone = "gold",
}: { children: ReactNode; className?: string; tone?: "ink" | "gold" | "paper" | "outline" }) {
  const tones = {
    ink: "bg-[#14110B] text-[#FAF7F0]",
    gold: "bg-[#F2B705] text-[#1A1505]",
    paper: "bg-white text-[#14110B]",
    outline: "border border-[#F5F1E8]/25 text-[#F5F1E8]",
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]", tones[tone], className)}>
      {children}
    </span>
  )
}

export function Sticker({ children, className, rotate = -6 }: { children: ReactNode; className?: string; rotate?: number }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full bg-[#F2B705] px-3 py-1 text-sm font-black text-[#1A1505] shadow-[0_6px_16px_-8px_rgba(242,183,5,0.9)]", className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </span>
  )
}

/* Número grande dourado (estilo "01") para bento/carrossel */
export function BigNumber({ n, className }: { n: number; className?: string }) {
  return <span className={cn("fl-display text-[#F2B705]", className)}>{String(n).padStart(2, "0")}</span>
}

export function DeckCounter({ current, total, className }: { current: number; total: number; className?: string }) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    <div className={cn("flex items-baseline gap-1 font-mono tabular-nums", className)}>
      <span className="fl-display text-4xl text-[#F2B705]">{pad(current)}</span>
      <span className="text-sm text-[#9A938A]">/ {pad(total)}</span>
    </div>
  )
}

/* ── Botões ───────────────────────────────────────────────────────────────── */
type BtnProps = { href?: string; children: ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; "aria-label"?: string }

function makeButton(base: string) {
  return function Btn({ href, children, className, onClick, type, ...rest }: BtnProps) {
    const cls = cn(base, "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold", className)
    if (href) return <Link href={href} className={cls} {...rest}>{children}</Link>
    return <button type={type ?? "button"} onClick={onClick} className={cls} {...rest}>{children}</button>
  }
}
export const GoldButton = makeButton("fl-btn-gold")
export const OutlineButton = makeButton("fl-btn-outline")
export const InkButton = makeButton("fl-btn-ink")
/** Botão pequeno contornado para dentro de cards brancos (ex.: COMEÇAR). */
export const CardButton = makeButton("fl-btn-card !px-4 !py-2 text-xs uppercase tracking-wider")

/* ── Seção + heading ──────────────────────────────────────────────────────── */
export function Section({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("relative w-full px-5 py-20 sm:px-8 md:py-24", className)}>
      <div className="mx-auto w-full max-w-[1180px]">{children}</div>
    </section>
  )
}

export function SectionHeading({
  children, className, align = "left", arrow,
}: { children: ReactNode; className?: string; align?: "left" | "center"; arrow?: ReactNode }) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <h2 className="fl-display text-4xl text-[#F5F1E8] sm:text-5xl md:text-6xl">{children}</h2>
      {arrow}
    </div>
  )
}

export { ArrowUpRight }
