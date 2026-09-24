"use client"

// A PELE DA SUPERVISÃO PARENTAL — amarelo forte quase laranja no fundo e
// turquesa escuro nos painéis (pedido do Alex, 2026-09-24: "deixe como a
// games, mas coloque elementos, deixe vibrante, elementos de games e
// vestidinhos de meninas").
//
// ⚠️ É A SILHUETA DO GAMES (banner largo, chip num canto, selo no outro,
// título gigante), mas SEM pills nem foto: aqui não há salas para navegar —
// a página é uma só. Pill que não leva a lugar nenhum é porta pintada.
//
// ⚠️ AS FIGURINHAS SÃO SVG NOSSO (controle, pixel-coração, estrela, coroa e o
// vestidinho, que o lucide não tem). Ficam numa camada `fixed` pintada UMA
// vez, sem animação: a regra de 2026-09-09 vale aqui também — nada de
// movimento numa camada do tamanho da janela. `aria-hidden` porque é enfeite.

import type { CSSProperties, ReactNode } from "react"
import { Crown, Gamepad2, Heart, Sparkles, Star } from "lucide-react"

/** A paleta, num lugar só. O turquesa é FUNDO; o amarelo é tinta sobre ele. */
export const PARENTAL = {
  sun: "#FFB300",
  sunDeep: "#FF8A00",
  teal: "#0F4C4F",
  tealDeep: "#0A3638",
  tealLine: "#06262A",
  cream: "#FFF6E0",
  pink: "#FF4F9A",
  mint: "#3FE0C5",
  ink: "#0B0B0D",
} as const

/** O vestidinho — alça, corpete e saia rodada com babado. */
export function DressIcon({
  className,
  color = PARENTAL.pink,
  trim = PARENTAL.cream,
  style,
}: {
  className?: string
  color?: string
  trim?: string
  style?: CSSProperties
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} style={style} aria-hidden>
      <path d="M24 6 L28 16 M40 6 L36 16" stroke={PARENTAL.ink} strokeWidth="3" strokeLinecap="square" />
      <path
        d="M22 16 H42 L39 30 L52 54 H12 L25 30 Z"
        fill={color}
        stroke={PARENTAL.ink}
        strokeWidth="3"
        strokeLinejoin="miter"
      />
      <path d="M25 30 H39" stroke={PARENTAL.ink} strokeWidth="3" />
      <path
        d="M12 54 Q16 59 20 54 Q24 59 28 54 Q32 59 36 54 Q40 59 44 54 Q48 59 52 54"
        fill="none"
        stroke={trim}
        strokeWidth="3"
      />
      <circle cx="32" cy="23" r="2.4" fill={trim} />
    </svg>
  )
}

/** Coração de pixel — o "vida extra" dos jogos antigos. */
export function PixelHeart({ className, color = PARENTAL.pink, style }: { className?: string; color?: string; style?: CSSProperties }) {
  const cells = [
    "0110110",
    "1111111",
    "1111111",
    "0111110",
    "0011100",
    "0001000",
  ]
  return (
    <svg viewBox="0 0 7 6" className={className} style={style} shapeRendering="crispEdges" aria-hidden>
      {cells.flatMap((row, y) =>
        row.split("").map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={color} /> : null))
      )}
    </svg>
  )
}

type Sticker = { top: string; left: string; size: number; rot: number; node: ReactNode }

/** As posições são fixas (nada de aleatório no render: o servidor e o
 *  navegador desenhariam figurinhas em lugares diferentes). */
function stickers(): Sticker[] {
  const P = PARENTAL
  const lu = (Icon: typeof Star, color: string) => (
    <Icon className="h-full w-full" strokeWidth={2.4} style={{ color }} />
  )
  return [
    { top: "6%", left: "4%", size: 64, rot: -14, node: <DressIcon className="h-full w-full" /> },
    { top: "14%", left: "88%", size: 58, rot: 12, node: lu(Gamepad2, P.tealDeep) },
    { top: "34%", left: "2%", size: 40, rot: 0, node: <PixelHeart className="h-full w-full" /> },
    { top: "46%", left: "92%", size: 70, rot: -8, node: <DressIcon className="h-full w-full" color={P.mint} /> },
    { top: "62%", left: "6%", size: 52, rot: 18, node: lu(Crown, P.pink) },
    { top: "74%", left: "84%", size: 44, rot: 0, node: <PixelHeart className="h-full w-full" color={P.tealDeep} /> },
    { top: "86%", left: "12%", size: 60, rot: -20, node: lu(Gamepad2, P.pink) },
    { top: "90%", left: "70%", size: 56, rot: 10, node: <DressIcon className="h-full w-full" color={P.cream} trim={P.pink} /> },
    { top: "24%", left: "22%", size: 26, rot: 0, node: lu(Sparkles, P.cream) },
    { top: "56%", left: "78%", size: 30, rot: 20, node: lu(Star, P.cream) },
    { top: "80%", left: "44%", size: 24, rot: 0, node: lu(Heart, P.tealDeep) },
    { top: "4%", left: "58%", size: 28, rot: -12, node: lu(Star, P.tealDeep) },
  ]
}

/** O fundo: amarelo-laranja com um raio de sol, bolinhas de meio-tom e as
 *  figurinhas. Pintado uma vez. */
export function ParentalBackdrop() {
  const P = PARENTAL
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${P.sun} 0%, ${P.sunDeep} 70%, #F27200 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: `radial-gradient(${P.tealDeep} 1.2px, transparent 1.6px)`,
          backgroundSize: "18px 18px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `repeating-conic-gradient(from 0deg at 50% -10%, ${P.cream} 0deg 6deg, transparent 6deg 18deg)`,
        }}
      />
      {stickers().map((s, i) => (
        <span
          key={i}
          className="absolute hidden sm:block"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            transform: `rotate(${s.rot}deg)`,
            filter: `drop-shadow(3px 3px 0 ${P.ink})`,
          }}
        >
          {s.node}
        </span>
      ))}
    </div>
  )
}
