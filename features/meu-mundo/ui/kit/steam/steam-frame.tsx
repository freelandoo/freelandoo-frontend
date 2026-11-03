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
// mm3d-60i: o miolo do tom ouro é translúcido como o menu lateral; o bronze é opaco.
// 2026-11-03 (Alex): a moldura virou a da NOTIFICAÇÃO EMOCIONAL (cantos
// chanfrados, ouro em camadas, brilho dourado, vermelho embaixo, sombra preta,
// losango) — as cantoneiras de engrenagem saíram; a opacidade do miolo é a mesma.
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
      <circle cx="20" cy="20" r="3.4" fill="#FF8A1F" />
    </svg>
  )
}

export function SteamFrame({
  children,
  tone = "gold",
  corners = true,
  // (cornerSize: das cantoneiras antigas; os chamadores ainda passam)
  cornerSize: _cornerSize = 54,
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
  return (
    <div className={`${s.frame} ${className}`} data-tone={tone} data-ignite={ignite ? "" : undefined} style={style}>
      {glow && <span aria-hidden className={s.glow} />}
      <div className={`${s.inner} ${innerClassName}`} style={innerStyle}>
        {children}
      </div>
      {ignite && <span aria-hidden className={s.sweep} />}
      {/* 2026-11-03: ornamentos da notificação emocional (losango, ponto de luz embaixo, brilhos nas quinas) */}
      {corners && tone === "gold" && (
        <>
          <span aria-hidden className={s.diamond} />
          <span aria-hidden className={s.hot} />
          <span aria-hidden className={s.spark} data-pos="tl" />
          <span aria-hidden className={s.spark} data-pos="br" />
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
