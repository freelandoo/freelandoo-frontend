"use client"

// features/meu-mundo/ui/kit/steam/steam-frame.tsx — a MOLDURA steampunk (mm3d-60).
//
// Camadas (de fora para dentro), sem filtro de tela inteira:
//   1. material  — aro de ouro envelhecido/bronze (gradiente) + sombra dura;
//   2. contorno  — sulco escuro e o FILETE CIANO de energia (box-shadow inset);
//   3. energia   — halo dourado/ciano por fora (camada própria; acende na abertura);
//   4. reflexo   — um brilho que corre o topo UMA vez ao abrir;
//   5. ornamento — cantoneiras de latão com engrenagem, rebites e um cristal,
//                  em SVG (a engrenagem dá um giro curto na abertura).
// A superfície (o miolo) é OPACA; só halo/reflexo usam alfa e opacidade.
// Nível de efeito: `html[data-mm-fx]` (fx-tier.ts) — no baixo fica só o material.

import { useId, type CSSProperties, type ReactNode } from "react"
import { cinzel } from "../../status/evo-skin"
import s from "./steam.module.css"

/** Contorno de engrenagem (polígono) centrado em (cx, cy). */
export function gearPath(cx: number, cy: number, teeth: number, ro: number, ri: number): string {
  const pts: string[] = []
  const step = (Math.PI * 2) / teeth
  for (let i = 0; i < teeth; i++) {
    const a = i * step
    const w = step * 0.22
    for (const [ang, r] of [
      [a - step / 2 + w, ri],
      [a - w * 1.1, ro],
      [a + w * 1.1, ro],
      [a + step / 2 - w, ri],
    ] as const) {
      pts.push(`${(cx + Math.cos(ang) * r).toFixed(2)},${(cy + Math.sin(ang) * r).toFixed(2)}`)
    }
  }
  return `M${pts.join("L")}Z`
}

/** Engrenagem de latão solta (cabeçalhos, medalhões). `spin` = gira devagar (só alta). */
export function Gear({ size = 28, className = "", spin = false, teeth = 10, color }: { size?: number; className?: string; spin?: boolean; teeth?: number; color?: string }) {
  const id = useId().replace(/:/g, "")
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} className={`${s.gearSolo} ${spin ? s.gearSpin : ""} ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color ?? "#FFE3A3"} />
          <stop offset="0.45" stopColor="#C8913F" />
          <stop offset="1" stopColor="#5E3B12" />
        </linearGradient>
      </defs>
      <path d={gearPath(20, 20, teeth, 18.5, 14.5)} fill={`url(#g${id})`} stroke="#2A1A07" strokeWidth="0.8" />
      <circle cx="20" cy="20" r="9.5" fill="#12171D" stroke="#E8B65B" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="3.4" fill="#20D9E9" />
    </svg>
  )
}

const CORNERS = ["tl", "tr", "bl", "br"] as const
type Corner = (typeof CORNERS)[number]

/** Cantoneira (desenhada para o canto de cima à esquerda; as outras são espelhos). */
function CornerPiece({ pos, size, gid }: { pos: Corner; size: number; gid: string }) {
  return (
    <svg viewBox="0 0 72 72" width={size} height={size} className={s.corner} data-pos={pos} aria-hidden>
      {/* esquadro duplo de latão com volutas nas pontas */}
      <path d="M3 52V12Q3 3 12 3H52" fill="none" stroke={`url(#r${gid})`} strokeWidth="4.2" strokeLinecap="round" />
      <path d="M10 44V15Q10 10 15 10H44" fill="none" stroke="#FFD68A" strokeOpacity="0.75" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M52 3q9 0 11 7q-4-3-8-1" fill="none" stroke={`url(#r${gid})`} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3 52q0 9 7 11q-3-4-1-8" fill="none" stroke={`url(#r${gid})`} strokeWidth="2.6" strokeLinecap="round" />
      {/* rebites */}
      <circle cx="31" cy="6.5" r="1.9" fill="#FFE3A3" stroke="#3A260C" strokeWidth="0.6" />
      <circle cx="6.5" cy="31" r="1.9" fill="#FFE3A3" stroke="#3A260C" strokeWidth="0.6" />
      {/* engrenagem do canto */}
      <g className={s.cornerGear}>
        <path d={gearPath(16, 16, 9, 12.5, 9.6)} fill={`url(#r${gid})`} stroke="#2A1A07" strokeWidth="0.7" />
        <circle cx="16" cy="16" r="6.2" fill="#10151B" stroke="#E8B65B" strokeWidth="1" />
      </g>
      {/* cristal de éter */}
      <path d="M16 11.2 19.6 16 16 20.8 12.4 16Z" fill="#20D9E9" className={s.crystal} />
      <path d="M16 11.2 17.4 16 16 20.8" fill="#BDF8FF" fillOpacity="0.7" />
    </svg>
  )
}

/** Gradientes das cantoneiras (um por moldura; ids únicos). */
function CornerDefs({ gid }: { gid: string }) {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id={`r${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE9B0" />
          <stop offset="0.35" stopColor="#E8B65B" />
          <stop offset="0.7" stopColor="#9A6424" />
          <stop offset="1" stopColor="#E0A955" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function SteamFrame({
  children,
  tone = "gold",
  corners = true,
  cornerSize = 54,
  ignite = true,
  glow = true,
  className = "",
  innerClassName = "",
  style,
  innerStyle,
}: {
  children?: ReactNode
  /** "gold" = painel grande (aro de ouro, filete ciano); "bronze" = card interno. */
  tone?: "gold" | "bronze"
  corners?: boolean
  cornerSize?: number
  /** Toca a abertura (halo acende, reflexo corre, engrenagens giram) ao montar. */
  ignite?: boolean
  glow?: boolean
  className?: string
  innerClassName?: string
  style?: CSSProperties
  innerStyle?: CSSProperties
}) {
  const gid = useId().replace(/:/g, "")
  return (
    <div className={`${s.frame} ${className}`} data-tone={tone} data-ignite={ignite ? "" : undefined} style={style}>
      {glow && <span aria-hidden className={s.glow} />}
      <div className={`${s.inner} ${innerClassName}`} style={innerStyle}>
        {children}
      </div>
      {ignite && <span aria-hidden className={s.sweep} />}
      {corners && (
        <>
          <CornerDefs gid={gid} />
          {CORNERS.map((c) => (
            <CornerPiece key={c} pos={c} size={cornerSize} gid={gid} />
          ))}
        </>
      )}
    </div>
  )
}

/** Título ornamentado (◆ — TEXTO — ◆) em ouro. */
export function SteamTitle({ children, as: Tag = "h2", size = 30, className = "", id }: { children: ReactNode; as?: "h1" | "h2" | "h3"; size?: number; className?: string; id?: string }) {
  return (
    <Tag id={id} className={`${cinzel.className} ${s.title} ${className}`} style={{ fontSize: size }}>
      {children}
    </Tag>
  )
}
