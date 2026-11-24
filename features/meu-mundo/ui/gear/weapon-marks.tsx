"use client"

// features/meu-mundo/ui/gear/weapon-marks.tsx — weapon-v1 (24/11/2026): as marcas da arma desenhadas em CÓDIGO
// (nada vem pintado na thumbnail): estrelas (1…5), a peça de quebra-cabeça do FRAGMENTO DE CLASSE (com as
// miniaturas das armas da classe dentro) e o frasco do PÓ de refino na cor da classe.

import { useId } from "react"
import { RANK, type Rank } from "../kit/aether-tokens"

type Tr = (key: string, fallback: string) => string

/** Caminho de uma estrela de 5 pontas centrada em (cx, cy). */
function starPath(cx: number, cy: number, ro: number, ri: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? ri : ro
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`)
  }
  return `M${pts.join("L")}Z`
}

/** As estrelas da cópia: acesas até `stars`, apagadas até `max`. Leitor de tela: "3 de 5 estrelas". */
export function WeaponStars({ stars, max = 5, size = 16, t }: { stars: number; max?: number; size?: number; t: Tr }) {
  const id = useId().replace(/:/g, "")
  const n = Math.max(0, Math.min(max, Math.floor(stars || 0)))
  const label = t("wfStarsOf", "{n} de {max} estrelas").replace("{n}", String(n)).replace("{max}", String(max))
  return (
    <svg role="img" aria-label={label} width={size * max + (max - 1) * 2} height={size} viewBox={`0 0 ${max * 22 - 2} 20`}>
      <title>{label}</title>
      <defs>
        <linearGradient id={`st${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3C4" />
          <stop offset="0.5" stopColor="#F2B705" />
          <stop offset="1" stopColor="#A86A00" />
        </linearGradient>
      </defs>
      {Array.from({ length: max }, (_, i) => (
        <path
          key={i}
          d={starPath(i * 22 + 10, 10.6, 9.6, 4.1)}
          fill={i < n ? `url(#st${id})` : "rgba(20,23,28,0.85)"}
          stroke={i < n ? "#3A2600" : "rgba(229,190,112,0.55)"}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

/**
 * Contorno de peça de quebra-cabeça (100×100 + encaixes): lingueta em cima e à direita, buraco embaixo e à
 * esquerda — as peças de uma classe parecem partes do mesmo desenho.
 */
const PIECE =
  "M18,18 L40,18 C40,8 44,2 50,2 C56,2 60,8 60,18 L82,18 L82,40 C92,40 98,44 98,50 C98,56 92,60 82,60 L82,82 L60,82 " +
  "C60,72 56,68 50,68 C44,68 40,72 40,82 L18,82 L18,60 C28,60 32,56 32,50 C32,44 28,40 18,40 Z"

/**
 * Fragmento de CLASSE: a peça leva as miniaturas das armas da classe (até 3, lado a lado, inclinadas) e a moldura
 * na cor da classe. Sem thumb, fica a letra da classe.
 */
export function FragmentPiece({ rank, thumbs, size = 72, t }: { rank: Rank; thumbs: string[]; size?: number; t: Tr }) {
  const id = useId().replace(/:/g, "")
  const tone = RANK[rank]
  const label = t("wfFragmentOf", "Fragmento de classe {r}").replace("{r}", t(tone.labelKey, tone.label))
  const pics = thumbs.slice(0, 3)
  const w = pics.length ? 80 / pics.length : 80
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 100 100">
      <title>{label}</title>
      <defs>
        <clipPath id={`pc${id}`}>
          <path d={PIECE} />
        </clipPath>
        <linearGradient id={`pg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1D2229" />
          <stop offset="1" stopColor="#0D0F13" />
        </linearGradient>
      </defs>
      <path d={PIECE} fill={`url(#pg${id})`} />
      <g clipPath={`url(#pc${id})`}>
        {pics.map((src, i) => (
          <image key={src + i} href={src} x={10 + i * w} y={2} width={w + 6} height={96} preserveAspectRatio="xMidYMid slice" opacity={0.95} />
        ))}
        {!pics.length && (
          <text x="50" y="62" textAnchor="middle" fontSize="34" fontWeight="700" fill={tone.color}>
            {tone.label.slice(0, 3)}
          </text>
        )}
        <rect x="0" y="0" width="100" height="100" fill={tone.color} opacity="0.12" />
      </g>
      <path d={PIECE} fill="none" stroke="#0A0C10" strokeWidth="5" strokeLinejoin="round" />
      <path d={PIECE} fill="none" stroke={tone.color} strokeWidth="2.4" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${tone.glow})` }} />
    </svg>
  )
}

/** Frasco do pó de refino na cor da classe da faixa (D…SSS). */
export function PowderVial({ rank, size = 28, label }: { rank: Rank; size?: number; label: string }) {
  const id = useId().replace(/:/g, "")
  const tone = RANK[rank]
  return (
    <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 32 32">
      <title>{label}</title>
      <defs>
        <radialGradient id={`pv${id}`} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="0.35" stopColor={tone.glow} />
          <stop offset="1" stopColor={tone.color} />
        </radialGradient>
      </defs>
      <rect x="12" y="2.5" width="8" height="5" fill="#B8893B" stroke="#2A1A07" strokeWidth="1" />
      <path d="M12.5,7.5 L19.5,7.5 L19.5,11 C25,13 27.5,17 27.5,21.5 C27.5,27 22.5,30 16,30 C9.5,30 4.5,27 4.5,21.5 C4.5,17 7,13 12.5,11 Z" fill="rgba(13,15,19,0.85)" stroke="#E5BE70" strokeWidth="1.2" />
      <path d="M6.5,20 C9,18.5 23,18.5 25.5,20 C25.8,25.5 21.5,28 16,28 C10.5,28 6.2,25.5 6.5,20 Z" fill={`url(#pv${id})`} />
      <circle cx="12" cy="23" r="1.1" fill="#FFF" opacity="0.8" />
      <circle cx="19" cy="22" r="0.8" fill="#FFF" opacity="0.6" />
    </svg>
  )
}
