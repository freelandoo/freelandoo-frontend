// features/meu-mundo/ui/status/evo-skin.tsx — a pele do jogo na web.
//
// Nasceu como o STATUS do EVO Brazil (chanfro, neon magenta). Desde a
// modernização visual (2026-10-25) as mesmas peças desenham a linguagem de
// ui/hud/tokens.ts: grafite translúcido, cantos arredondados, bordas finas,
// rubi no que está escolhido. Teko fica para números grandes; o resto é
// Archivo. Cor escrita aqui e em tokens.ts — as páginas não digitam hex.

import type { CSSProperties, ReactNode } from "react"
import { Archivo, Teko } from "next/font/google"
import { MM } from "../hud/tokens"

export const teko = Teko({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })
export const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })

// ═══ a paleta ═══
// Os NOMES ficaram (as páginas usam EVO.x); as cores são as de MM: rubi no
// lugar do magenta neon, dourado discreto, linhas brancas finas.
export const EVO = {
  preto: "#0c0f14",
  carvao: "#151a21",
  carvao2: "#1e232b",
  fumaca: "#2c323c",
  magenta: "#D02A5E",
  rosa: "#D94B7B",
  rosaClaro: "#F08DAE",
  ritual: MM.rubyDark,
  vinho: "#4a0a1c",
  dourado: "#D9AE62",
  douradoClaro: "#F0D39C",
  douradoEscuro: "#5e4521",
  ambar: "#ffaa4a",
  ambarFundo: "#a85a0c",
  branco: MM.text,
  mudo: MM.muted,
  mudoEscuro: "#6f7682",
  linha: MM.border,
  linhaForte: MM.borderStrong,
  perigo: "#ff3344",
  bom: "#5fe39a",
  azul: "#3a9bff",
  roxo: "#a64dff",
} as const

/**
 * Fundos (grafite translúcido). `card` = placas e cards; `moldura` = o fundo
 * grande atrás deles. Mudar a transparência do jogo = mudar aqui.
 */
export const FUNDO = {
  card: "rgba(30, 35, 43, 0.72)",
  cardLiso: "rgba(30, 35, 43, 0.72)",
  moldura: "rgba(18, 22, 28, 0.74)",
} as const

/** O tempo: resposta rápida, painel, tela, escalonamento. */
export const T = { rapido: 140, painel: 220, tela: 420, escalona: 45 } as const

/** Raio do canto pelo antigo tamanho do chanfro (painéis 20, cards 14, miúdos 10). */
export function radiusFor(cut: number) {
  return cut >= 16 ? MM.radius.panel : cut <= 8 ? 10 : MM.radius.card
}

/**
 * Caixa arredondada com borda fina (era a moldura chanfrada do EVO; nome e
 * API ficaram para não mexer em quem chama). A borda é CSS de verdade; uma
 * borda em gradiente vira contorno rubi.
 */
export function Chamfer({
  cut = 16,
  border = MM.border,
  fill = FUNDO.card,
  width = 1,
  className = "",
  style,
  children,
}: {
  cut?: number
  border?: string
  fill?: string
  width?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const color = border.includes("gradient") ? MM.rubyBorder : border
  return (
    <div className={`relative ${className}`} style={{ borderRadius: radiusFor(cut), background: fill, border: `${Math.min(width, 2)}px solid ${color}`, ...style }}>
      <div className="relative h-full w-full">{children}</div>
    </div>
  )
}

/** Placa com título (os blocos de dentro dos modais e do STATUS). */
export function Plate({
  title,
  aside,
  children,
  className = "",
  pad = "p-4",
}: {
  title?: string
  aside?: ReactNode
  children?: ReactNode
  className?: string
  pad?: string
}) {
  return (
    <Chamfer cut={14} className={className}>
      <div className={`h-full ${pad}`}>
        {title && (
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className={`${archivo.className} text-[15px] font-bold uppercase leading-tight tracking-[0.12em]`} style={{ color: EVO.douradoClaro }}>
              {title}
            </h3>
            {aside}
          </div>
        )}
        {children}
      </div>
    </Chamfer>
  )
}

/** Barra fina; `mark` desenha um traço dourado (o piso que não se perde). */
export function Bar({ value, max = 100, color, height = 10, min = 0, mark }: { value: number; max?: number; color: string; height?: number; min?: number; mark?: number }) {
  const at = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min || 1)))
  const p = at(value)
  return (
    <div className="relative w-full" style={{ height, borderRadius: 999, background: "rgba(0,0,0,0.45)", boxShadow: `inset 0 0 0 1px ${EVO.linha}` }}>
      <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 999, background: color }} />
      {mark != null && mark > min && (
        <div className="absolute" style={{ left: `calc(${at(mark) * 100}% - 1px)`, top: -4, bottom: -4, width: 3, borderRadius: 2, background: EVO.douradoClaro }} />
      )}
    </div>
  )
}

/** Etiqueta ("TENSO", "CANSADO"): pílula pequena. */
export function Tag({ children, tone = "ouro" }: { children: ReactNode; tone?: "ouro" | "perigo" | "bom" | "mudo" }) {
  const bg = tone === "perigo" ? "rgba(255,51,68,0.18)" : tone === "bom" ? "rgba(95,227,154,0.16)" : tone === "mudo" ? "rgba(255,255,255,0.08)" : "rgba(229,190,112,0.16)"
  const fg = tone === "perigo" ? "#ff7b86" : tone === "bom" ? EVO.bom : tone === "mudo" ? EVO.branco : EVO.douradoClaro
  return (
    <span
      className={`${archivo.className} inline-flex items-center px-2.5 text-[12px] font-bold uppercase leading-[22px] tracking-[0.08em]`}
      style={{ background: bg, color: fg, borderRadius: 999, boxShadow: `inset 0 0 0 1px ${fg}44` }}
    >
      {children}
    </span>
  )
}

/** Ícone num anel colorido (os círculos à esquerda de cada linha). */
export function Ring({ color, children, size = 46 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: "50%", border: `1.5px solid ${color}`, color, background: `${color}14` }}
    >
      {children}
    </span>
  )
}

/** Anel de progresso (o "35% DA FAIXA" do anexo). */
export function Gauge({ value, label, size = 168, color = EVO.ambar }: { value: number; label: string; size?: number; color?: string }) {
  const r = size / 2 - 10
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, value / 100))
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.4)" stroke={EVO.fumaca} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${teko.className} text-[54px] font-bold leading-[0.9]`} style={{ color: EVO.branco }}>
          {Math.round(value)}
        </span>
        <span className={`${archivo.className} text-[12px] font-semibold uppercase tracking-[0.16em]`} style={{ color: EVO.douradoClaro }}>
          {label}
        </span>
      </div>
    </div>
  )
}

/** Cor da barra pelo valor (vida: vermelho só no último terço). */
export function toneFor(v: number, good: "high" | "low" = "high") {
  const x = good === "high" ? v : 100 - v
  if (x < 34) return EVO.perigo
  if (x < 60) return EVO.ambar
  return EVO.bom
}
