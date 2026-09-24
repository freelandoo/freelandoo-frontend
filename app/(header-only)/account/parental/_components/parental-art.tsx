"use client"

// A PELE DA SUPERVISÃO PARENTAL — luz âmbar/laranja sobre turquesa escuro, na
// receita do Financeiro (gradiente, iluminação, opacidade — Alex, 2026-09-24:
// "deixe como a games, com elementos de games e vestidinhos de meninas" e,
// depois, "quero como essa página [o Financeiro]: gradiente, iluminação, opacidade").
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
    <Icon className="h-full w-full" strokeWidth={2.2} style={{ color }} />
  )
  // Uma grade solta de "marcas d'água", como os cifrões do Financeiro: poucas
  // cores (âmbar, laranja, menta, rosa) e opacidade baixa, aplicada na camada.
  const cycle = [
    (c: string) => <DressIcon className="h-full w-full" color={c} trim={P.cream} />,
    (c: string) => lu(Gamepad2, c),
    (c: string) => <PixelHeart className="h-full w-full" color={c} />,
    (c: string) => lu(Crown, c),
    (c: string) => lu(Star, c),
    (c: string) => <DressIcon className="h-full w-full" color={c} trim={P.cream} />,
    (c: string) => lu(Sparkles, c),
    (c: string) => lu(Heart, c),
  ]
  const colors = [P.sun, P.sunDeep, P.mint, P.pink]
  const out: Sticker[] = []
  const rows = 7
  const cols = 6
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      const shift = r % 2 ? 8 : 0
      out.push({
        top: `${4 + r * 14}%`,
        left: `${2 + c * 17 + shift}%`,
        size: i % 3 === 0 ? 46 : i % 3 === 1 ? 30 : 22,
        rot: ((i * 37) % 40) - 20,
        node: cycle[i % cycle.length](colors[(i + r) % colors.length]),
      })
    }
  }
  return out
}

/** O fundo — a receita do Financeiro com a paleta daqui: canvas turquesa
 *  escuro, focos de luz âmbar/laranja, grade fina e as figurinhas como marca
 *  d'água. Pintado UMA vez e promovido à própria camada de composição (a
 *  mesma nota da `.fl-finance-bg`: sem isso os gradientes seriam repintados a
 *  cada quadro de rolagem). */
export function ParentalBackdrop() {
  const P = PARENTAL
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ transform: "translateZ(0)", willChange: "transform" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#041A1C",
          backgroundImage: [
            "radial-gradient(60% 45% at 18% 14%, rgba(255, 170, 0, 0.42), transparent 70%)",
            "radial-gradient(52% 42% at 86% 26%, rgba(255, 120, 0, 0.26), transparent 72%)",
            "radial-gradient(70% 50% at 70% 72%, rgba(15, 76, 79, 0.55), transparent 72%)",
            "radial-gradient(80% 55% at 50% 108%, rgba(255, 150, 0, 0.30), transparent 70%)",
            "repeating-linear-gradient(to right, rgba(255, 179, 0, 0.06) 0 1px, transparent 1px 64px)",
            "repeating-linear-gradient(to bottom, rgba(63, 224, 197, 0.05) 0 1px, transparent 1px 64px)",
          ].join(", "),
        }}
      />
      <div className="absolute inset-0 opacity-[0.13]">
        {stickers().map((s, i) => (
          <span
            key={i}
            className="absolute"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              transform: `rotate(${s.rot}deg)`,
            }}
          >
            {s.node}
          </span>
        ))}
      </div>
      {/* Vinheta: escurece as bordas para o centro "acender", como no Financeiro. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 90% at 50% 30%, transparent 55%, rgba(2, 14, 15, 0.7) 100%)" }}
      />
    </div>
  )
}
