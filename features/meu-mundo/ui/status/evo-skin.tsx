// features/meu-mundo/ui/status/evo-skin.tsx — a pele EVO na web.
//
// A tela de STATUS do Meu Mundo é a do STATUS do EVO Brazil/Cat demon
// (Cat demon/jogo/ui/evo/status/*, Godot), refeita em React: mesma paleta
// (ui/evo/evo.gd), mesmas fontes (Teko nos títulos e números, Archivo no
// texto, Yuji Syuku no selo kanji), molduras CHANFRADAS no canto superior
// direito e no inferior esquerdo, neon MAGENTA só no que está aceso, metal
// dourado discreto. Cor escrita aqui e só aqui — as páginas não digitam hex.

import type { CSSProperties, ReactNode } from "react"
import { Archivo, Teko } from "next/font/google"
import localFont from "next/font/local"

export const teko = Teko({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })
export const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" })
// Recorte da Yuji Syuku do EVO Brazil (só ~100 ideogramas; ver fonts/LICENCA.txt).
export const kanji = localFont({ src: "./fonts/YujiSyuku-Kanji.ttf", display: "block" })

// ═══ a paleta (ui/evo/evo.gd) ═══
export const EVO = {
  preto: "#08070b",
  carvao: "#151318",
  carvao2: "#1f1b22",
  fumaca: "#2c2730",
  magenta: "#ff006e",
  rosa: "#ff168a",
  rosaClaro: "#ff6fb1",
  ritual: "#a91332",
  vinho: "#4a0a1c",
  dourado: "#d6a75b",
  douradoClaro: "#f2d39a",
  douradoEscuro: "#5e4521",
  ambar: "#ffaa4a",
  ambarFundo: "#a85a0c",
  branco: "#f5f1ed",
  mudo: "#a39aa3",
  mudoEscuro: "#6b636b",
  linha: "rgba(245,240,237,0.13)",
  linhaForte: "rgba(245,240,237,0.28)",
  perigo: "#ff3344",
  bom: "#5fe39a",
  azul: "#3a9bff",
  roxo: "#a64dff",
} as const

/** O tempo (evo.gd): resposta rápida, painel, tela, escalonamento. */
export const T = { rapido: 140, painel: 360, tela: 750, escalona: 65 } as const

/** Polígono do chanfro: canto superior direito e inferior esquerdo cortados. */
export function chamfer(cut: number) {
  return `polygon(0 0, calc(100% - ${cut}px) 0, 100% ${cut}px, 100% 100%, ${cut}px 100%, 0 calc(100% - ${cut}px))`
}

/**
 * Moldura chanfrada: a borda é a camada de fora, o recheio a de dentro (o
 * clip-path corta sombra e borda, então a "linha" é a diferença entre as duas).
 */
export function Chamfer({
  cut = 16,
  border = EVO.linhaForte,
  fill = "linear-gradient(180deg, rgba(16,10,14,0.86), rgba(10,7,11,0.86))",
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
  return (
    <div className={`relative ${className}`} style={{ clipPath: chamfer(cut), background: border, padding: width, ...style }}>
      <div className="relative h-full w-full" style={{ clipPath: chamfer(Math.max(0, cut - width)), background: fill }}>
        {children}
      </div>
    </div>
  )
}

/** Placa com título dourado (os blocos de dentro dos modais). */
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
    <Chamfer cut={16} className={className}>
      <div className={`h-full ${pad}`}>
        {title && (
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h3 className={`${teko.className} text-[30px] font-semibold uppercase leading-none tracking-wide`} style={{ color: EVO.ambar }}>
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

/** Barra fina com trilho escuro (as barras dos anexos do STATUS). */
/** Barra fina; `mark` desenha um traço dourado (o piso que não se perde). */
export function Bar({ value, max = 100, color, height = 10, min = 0, mark }: { value: number; max?: number; color: string; height?: number; min?: number; mark?: number }) {
  const at = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min || 1)))
  const p = at(value)
  return (
    <div className="relative w-full" style={{ height, background: "rgba(0,0,0,0.55)", boxShadow: `inset 0 0 0 1px ${EVO.linha}` }}>
      <div style={{ width: `${p * 100}%`, height: "100%", background: color, boxShadow: `0 0 10px ${color}66` }} />
      {mark != null && mark > min && (
        <div className="absolute" style={{ left: `calc(${at(mark) * 100}% - 1px)`, top: -4, bottom: -4, width: 3, background: EVO.douradoClaro, boxShadow: `0 0 6px ${EVO.dourado}` }} />
      )}
    </div>
  )
}

/** Etiqueta dourada ("TENSO", "CANSADO"). */
export function Tag({ children, tone = "ouro" }: { children: ReactNode; tone?: "ouro" | "perigo" | "bom" | "mudo" }) {
  const bg = tone === "perigo" ? EVO.perigo : tone === "bom" ? EVO.bom : tone === "mudo" ? EVO.fumaca : EVO.douradoClaro
  const fg = tone === "mudo" ? EVO.branco : EVO.preto
  return (
    <span
      className={`${teko.className} inline-flex items-center px-2 pt-[3px] text-[17px] font-semibold uppercase leading-[22px] tracking-wider`}
      style={{ background: bg, color: fg, boxShadow: `0 0 0 2px ${EVO.douradoEscuro}` }}
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
      style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${color}`, color, boxShadow: `0 0 12px ${color}55` }}
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.5)" stroke={EVO.fumaca} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${c * p} ${c}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${teko.className} text-[54px] font-bold leading-[0.9]`} style={{ color: EVO.branco }}>
          {Math.round(value)}
        </span>
        <span className={`${teko.className} text-[17px] font-medium uppercase tracking-[0.2em]`} style={{ color: EVO.douradoClaro }}>
          {label}
        </span>
      </div>
    </div>
  )
}

/** Cor da barra pelo valor (vida: vermelho só no último terço — evo.gd PERIGO). */
export function toneFor(v: number, good: "high" | "low" = "high") {
  const x = good === "high" ? v : 100 - v
  if (x < 34) return EVO.perigo
  if (x < 60) return EVO.ambar
  return EVO.bom
}
