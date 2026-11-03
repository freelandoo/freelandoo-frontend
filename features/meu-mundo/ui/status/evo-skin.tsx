// features/meu-mundo/ui/status/evo-skin.tsx — a pele do jogo na web.
//
// Nasceu como o STATUS do EVO Brazil (chanfro, neon magenta). Desde a
// modernização visual (2026-10-25) as mesmas peças desenham a linguagem de
// ui/hud/tokens.ts: grafite translúcido, cantos arredondados, bordas finas,
// rubi no que está escolhido. Teko fica para números grandes; o resto é
// Archivo. Cor escrita aqui e em tokens.ts — as páginas não digitam hex.

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import localFont from "next/font/local"
import { MM } from "../hud/tokens"
import { SP } from "../kit/steam/steam-tokens"
import { currentUiFx } from "../kit/steam/fx-tier"
import sk from "../kit/steam/steam.module.css"

// mm3d-60n: Teko e Archivo em arquivo local (lib/fonts) — o build da Vercel falhava
// às vezes baixando do Google. Fontes variáveis, subconjunto latin.
export const teko = localFont({ src: "../../../../lib/fonts/Teko-latin.woff2", weight: "300 700", display: "swap", fallback: ["Impact", "Arial Narrow", "sans-serif"] })
export const archivo = localFont({ src: "../../../../lib/fonts/Archivo-latin.woff2", weight: "100 900", display: "swap", fallback: ["Arial", "sans-serif"] })
/** mm3d-60: títulos ornamentados (a serifa das referências steampunk). Arquivo local (o build não
 * baixa do Google: o download falhou duas vezes no deploy). Fonte variável 600–800. */
export const cinzel = localFont({ src: "./fonts/Cinzel-latin.woff2", weight: "600 800", display: "swap", fallback: ["Georgia", "serif"] })

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
  // mm3d-59: OPACOS (o cenário nunca atravessa card/modal)
  card: "#1D2229",
  cardLiso: "#1D2229",
  moldura: "#14171C",
} as const

/** O tempo: resposta rápida, painel, tela, escalonamento. */
export const T = { rapido: 140, painel: 220, tela: 420, escalona: 45 } as const

/** Raio do canto pelo antigo tamanho do chanfro (painéis 20, cards 14, miúdos 10). */
export function radiusFor(cut: number) {
  void cut
  return 0
}

/** Canto chanfrado (os quatro), em px — o mesmo de ui/kit (AE.cut). */
const clipCut = (c: number) => `polygon(${c}px 0, calc(100% - ${c}px) 0, 100% ${c}px, 100% calc(100% - ${c}px), calc(100% - ${c}px) 100%, ${c}px 100%, 0 calc(100% - ${c}px), 0 ${c}px)`

/** "#RRGGBB" → a cor com alfa (cor que não é hex sólido volta como veio). */
function withAlpha(c: string, a: string) {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? `${c}${a}` : c
}

/**
 * Card do jogo (era a moldura chanfrada do EVO; nome e API ficaram para não
 * mexer em quem chama). mm3d-60: com a borda PADRÃO vira a peça steampunk —
 * aro de bronze em gradiente, miolo de "vidro fumê" opaco e um fio de luz no
 * topo. Borda/recheio próprios (placa de luta, faixa da visita) ficam lisos.
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
  // chanfro DE VERDADE — a borda é a camada de fora e o recheio opaco vem por
  // cima, recortado com o mesmo chanfro menos a espessura.
  const steam = border === MM.border
  const color = steam ? SP.rimSoft : border.includes("gradient") ? MM.rubyBorder : border
  const w = Math.min(width, 2)
  const c = Math.max(4, Math.round(cut * 0.6))
  const steamFill = fill === FUNDO.card || fill === FUNDO.cardLiso
  const inner: CSSProperties = steam
    ? {
        background: steamFill ? SP.plate : fill,
        boxShadow: "inset 0 1px 0 rgba(255,214,138,0.13), inset 0 0 0 1px rgba(0,0,0,0.55), inset 0 -10px 18px -12px rgba(32,217,233,0.18)",
      }
    : { background: fill }
  // sombra dura: o recorte cortaria o box-shadow, então ela vira drop-shadow de um invólucro
  const { boxShadow, ...rest } = style || {}
  const box = (
    <div className={`relative ${boxShadow ? "h-full w-full" : className}`} style={{ background: color, clipPath: clipCut(c), padding: w, ...rest }}>
      <div className="relative h-full w-full" style={{ ...inner, clipPath: clipCut(Math.max(2, c - w)) }}>
        {children}
      </div>
    </div>
  )
  if (!boxShadow) return box
  return (
    <div className={`relative ${className}`} style={{ filter: "drop-shadow(4px 4px 0 #000)" }}>
      {box}
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
            <h3 className={`${cinzel.className} ${sk.plateTitle} text-[15px] font-bold uppercase leading-tight tracking-[0.1em]`}>{title}</h3>
            {aside}
          </div>
        )}
        {children}
      </div>
    </Chamfer>
  )
}

/**
 * Barra de energia: trilho afundado, preenchimento em gradiente que desliza
 * (transform — nada de animar largura), reflexo interno e uma luz na ponta.
 * Entra do zero ao abrir e escorrega até o valor novo quando ele muda.
 * `mark` desenha um traço dourado (o piso que não se perde).
 */
export function Bar({ value, max = 100, color, height = 10, min = 0, mark }: { value: number; max?: number; color: string; height?: number; min?: number; mark?: number }) {
  const at = (v: number) => Math.max(0, Math.min(1, (v - min) / (max - min || 1)))
  const p = at(value)
  const solid = /^#[0-9a-fA-F]{6}$/.test(color)
  const fill = solid ? `linear-gradient(90deg, ${withAlpha(color, "88")} 0%, ${color} 62%, ${color} 100%)` : color
  return (
    <div className="relative w-full" style={{ height }}>
      <div className={sk.barTrack}>
        <div className={sk.barFill} style={{ transform: `translateX(${(p - 1) * 100}%)`, background: fill }}>
          {height >= 6 && <span className={sk.barShine} />}
          {p > 0.015 && <span className={sk.barTip} style={{ boxShadow: `0 0 ${Math.max(4, height)}px ${Math.max(1, height / 4)}px ${solid ? color : SP.goldHi}` }} />}
        </div>
      </div>
      {mark != null && mark > min && (
        <div className="absolute" style={{ left: `calc(${at(mark) * 100}% - 1px)`, top: -4, bottom: -4, width: 3, borderRadius: 2, background: EVO.douradoClaro, boxShadow: "0 0 0 1px #000" }} />
      )}
    </div>
  )
}

/**
 * Número que corre até o valor (só a EXIBIÇÃO interpola; o valor de verdade
 * é o que veio do servidor). Sem re-render por quadro: escreve no próprio nó.
 */
export function CountUp({ value, digits = 0 }: { value: number; digits?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const shown = useRef<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = (v: number) => (digits ? v.toFixed(digits) : String(Math.round(v)))
    const from = shown.current ?? 0
    if (from === value || currentUiFx() === "low") {
      el.textContent = fmt(value)
      shown.current = value
      return
    }
    const t0 = performance.now()
    const dur = 650
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur)
      const v = from + (value - from) * (1 - Math.pow(1 - k, 3))
      el.textContent = fmt(v)
      shown.current = k < 1 ? v : value
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      el.textContent = fmt(value)
      shown.current = value
    }
  }, [value, digits])
  return <span ref={ref}>{digits ? value.toFixed(digits) : Math.round(value)}</span>
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

/** Ícone num medalhão de latão (os círculos à esquerda de cada linha). */
export function Ring({ color, children, size = 46 }: { color: string; children: ReactNode; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        color,
        background: "radial-gradient(circle at 50% 32%, #2C3540 0%, #151A21 62%, #0B0E12 100%)",
        boxShadow: `inset 0 0 0 1.5px ${color}, inset 0 0 10px ${withAlpha(color, "40")}, 0 0 0 2px #07090C, 0 0 0 3px #8A6430, 0 0 12px ${withAlpha(color, "38")}`,
      }}
    >
      {children}
    </span>
  )
}

/** Medidor circular de energia (o "35% DA FAIXA" do anexo): arco luminoso, marcas de latão. */
export function Gauge({ value, label, size = 168, color = EVO.ambar }: { value: number; label: string; size?: number; color?: string }) {
  const r = size / 2 - 12
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(1, value / 100))
  const off = c * (1 - p)
  const len = { "--len": c } as CSSProperties
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill="none" stroke="#8A6430" strokeWidth={1.5} />
        <circle cx={size / 2} cy={size / 2} r={size / 2 - 5} fill="none" stroke="#E8B65B" strokeOpacity={0.55} strokeWidth={3} strokeDasharray="1.2 7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.45)" stroke="#0A0D11" strokeWidth={10} />
        <circle className={sk.gaugeArc} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={16} strokeDasharray={c} strokeDashoffset={off} style={len} />
        <circle className={sk.gaugeArc} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={len} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${teko.className} text-[54px] font-bold leading-[0.9]`} style={{ color: EVO.branco, textShadow: `0 0 14px ${withAlpha(color, "66")}` }}>
          <CountUp value={Math.round(value)} />
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
