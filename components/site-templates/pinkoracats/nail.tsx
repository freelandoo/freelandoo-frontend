// A UNHA DESENHADA — a peça de que todo placeholder é feito.
//
// É SVG e não imagem por dois motivos: pinta com as cores DO PRODUTO (`tint`),
// então cada placeholder já adianta o produto que vai ocupar aquele lugar; e
// pesa zero requisição. `useId` dá a cada instância gradientes próprios —
// ids repetidos no mesmo documento fariam todas as unhas herdarem o
// gradiente da primeira, sem erro nenhum.

import { useId } from "react"

import type { NailShape } from "./content/products.mock"

const PATHS: Record<NailShape, string> = {
  almond: "M30 4 C50 4 56 40 56 80 L56 130 Q56 136 50 136 L10 136 Q4 136 4 130 L4 80 C4 40 10 4 30 4Z",
  stiletto: "M30 2 C40 30 56 60 56 92 L56 130 Q56 136 50 136 L10 136 Q4 136 4 130 L4 92 C4 60 20 30 30 2Z",
  coffin: "M14 6 L46 6 L56 90 L56 130 Q56 136 50 136 L10 136 Q4 136 4 130 L4 90 Z",
  square: "M9 6 L51 6 Q56 6 56 11 L56 130 Q56 136 50 136 L10 136 Q4 136 4 130 L4 11 Q4 6 9 6Z",
}

export function Nail({
  shape,
  tint,
  className,
  style,
}: {
  shape: NailShape
  tint: [string, string]
  className?: string
  style?: React.CSSProperties
}) {
  const id = useId().replace(/:/g, "")
  const d = PATHS[shape]
  return (
    <svg viewBox="0 0 60 140" className={className} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint[0]} />
          <stop offset="0.62" stopColor={tint[0]} />
          <stop offset="1" stopColor={tint[1]} />
        </linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint[1]} stopOpacity="0.95" />
          <stop offset="1" stopColor={tint[1]} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`c${id}`}>
          <path d={d} />
        </clipPath>
      </defs>
      <path d={d} fill={`url(#b${id})`} />
      <g clipPath={`url(#c${id})`}>
        {/* a ponta: é onde o desenho de cada set mora */}
        <rect x="0" y="0" width="60" height="46" fill={`url(#t${id})`} />
        {/* o reflexo especular — sem ele a unha lê como papel recortado */}
        <rect x="12" y="10" width="9" height="110" rx="4.5" fill={`url(#s${id})`} opacity="0.7" />
        <rect x="40" y="30" width="3" height="70" rx="1.5" fill="#fff" opacity="0.22" />
      </g>
      <path d={d} fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="0.8" />
    </svg>
  )
}
