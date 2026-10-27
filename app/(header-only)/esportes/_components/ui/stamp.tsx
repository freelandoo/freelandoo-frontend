// OS CARIMBOS DO PAPEL — ✓, ✕ e o carimbo de texto (VENCIDA, PAGO, TREINO
// CONCLUÍDO). "Tinta gasta" por MÁSCARA de falhas estática, não por filtro:
// um feTurbulence em 31 células re-rasteriza a cada quadro do carimbo caindo;
// a máscara é só geometria. Três variantes de traço por `variant` (o dia % 3),
// para o mês não parecer feito com o mesmo carimbo copiado.

import { useId } from "react"

const X_PATHS = [
  ["M5 5.5 L19 18.5", "M18.6 5 L5.4 19"],
  ["M4.6 6 L19.4 18", "M19 5.6 L5 18.6"],
  ["M5.4 4.8 L18.8 19.2", "M18.2 4.6 L5.8 19.4"],
]
const CHECK_PATHS = ["M4 12.8 L9.4 18 L20 6.2", "M4.4 12.2 L9.6 17.6 L19.6 6.6", "M3.8 13.2 L9.2 18.4 L20.2 5.8"]

// Falhas da tinta: pontos fixos (não aleatórios — o servidor e o cliente
// desenham igual e o dia 12 é sempre o mesmo carimbo).
const SPECKS = [
  [6, 8, 0.9],
  [15, 6, 0.7],
  [11, 13, 0.8],
  [17, 15, 0.6],
  [8, 17, 0.7],
  [13, 19, 0.5],
  [19, 10, 0.6],
  [5, 13, 0.5],
]

function Wear({ id, variant }: { id: string; variant: number }) {
  return (
    <mask id={id}>
      <rect width="24" height="24" fill="white" />
      {SPECKS.map(([x, y, r], i) => (
        <rect
          key={i}
          x={x + ((i + variant) % 3) - 1}
          y={y + ((i * 2 + variant) % 3) - 1}
          width={r * 1.6}
          height={r}
          fill="black"
        />
      ))}
    </mask>
  )
}

export function InkX({ variant = 0, color = "#D7261E", className }: { variant?: number; color?: string; className?: string }) {
  const mid = useId().replace(/:/g, "")
  const [a, b] = X_PATHS[variant % 3]
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden style={{ mixBlendMode: "multiply" }}>
      <defs>
        <Wear id={`w${mid}`} variant={variant} />
      </defs>
      <g mask={`url(#w${mid})`} stroke={color} strokeWidth={3.6} strokeLinecap="square" fill="none" opacity={0.9}>
        <path d={a} />
        <path d={b} />
      </g>
    </svg>
  )
}

export function InkCheck({ variant = 0, color = "#16A34A", className }: { variant?: number; color?: string; className?: string }) {
  const mid = useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <Wear id={`w${mid}`} variant={variant + 1} />
      </defs>
      <path
        d={CHECK_PATHS[variant % 3]}
        mask={`url(#w${mid})`}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />
    </svg>
  )
}

/**
 * Carimbo de texto — moldura dupla reta, caixa alta condensada. Mora DENTRO de
 * um `StampMark` (quem gira/anima é ele).
 */
export function TextStamp({
  children,
  color = "#D7261E",
  className,
  size = "sm",
}: {
  children: React.ReactNode
  color?: string
  className?: string
  size?: "sm" | "lg"
}) {
  return (
    <span
      className={`fl-display inline-block whitespace-nowrap uppercase leading-none ${size === "lg" ? "px-4 py-2 text-3xl md:text-4xl" : "px-2 py-1 text-sm"} ${className ?? ""}`}
      style={{
        color,
        border: `${size === "lg" ? 4 : 2}px solid ${color}`,
        outline: `${size === "lg" ? 2 : 1}px solid ${color}`,
        outlineOffset: size === "lg" ? 3 : 2,
        opacity: 0.92,
        // tinta gasta no texto: falhas por máscara de listras finas
        WebkitMaskImage:
          "repeating-linear-gradient(115deg, #000 0 7px, rgba(0,0,0,.55) 7px 8px, #000 8px 13px, rgba(0,0,0,.7) 13px 14px)",
        maskImage:
          "repeating-linear-gradient(115deg, #000 0 7px, rgba(0,0,0,.55) 7px 8px, #000 8px 13px, rgba(0,0,0,.7) 13px 14px)",
      }}
    >
      {children}
    </span>
  )
}
