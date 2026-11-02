"use client"

// features/meu-mundo/ui/hud/fight-plate.tsx — A PLACA DE LUTA (2026-11-02).
//
// Pedido do Alex: trazer para a Arena das Lâminas, o Boxe e o Paint a placa do
// "valendo" do Cat demon (jogo/scripts/ui/hud_partida.gd, `_monta_placa`):
//  - RETRATO alto 2:3, chanfrado no canto de baixo (MolduraEvo "carta"),
//    moldura de metal dourado e halo magenta;
//  - o SANGUE em paralelogramo (BarraEvo) SAINDO DE TRÁS do retrato: degradê
//    rosa → magenta, faixa de brilho no terço de cima, contorno dourado, marcas
//    de 25%, vermelho no último terço, e o FANTASMA branco — o pedaço perdido
//    fica parado 0,22 s e só então escorre (cai 0,14 s, espera, escorre 0,45 s);
//  - o FÔLEGO âmbar, fino, recuado e passando um pouco abaixo da foto;
//  - o NOME em pincel (Knewave) no alto da cunha e o NÚMERO grande (Anton
//    inclinado) pousado na ponta fina, com brilho magenta.
// `mirrored` vira tudo (o retrato vai para a direita e as barras crescem para
// a esquerda): no duelo, cada barra cresce A PARTIR da cara de quem ela mede.
// Todas as medidas saem da largura do retrato (`pw`), como no Godot: a placa
// grande e a pequena são a mesma peça em outra escala.

import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { Anton, Knewave } from "next/font/google"
import { VenetianMask } from "lucide-react"

const knewave = Knewave({ subsets: ["latin"], weight: "400", display: "swap" })
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap" })

// a paleta do Cat demon (ui/evo/evo.gd), sem o remapeamento para rubi do jogo
const C = {
  rosa: "#ff168a",
  magentaFundo: "#bf0052", // MAGENTA.darkened(0.25)
  perigo: "#ff3344",
  ritualFundo: "#760d23", // RITUAL.darkened(0.3)
  ambar: "#ffaa4a",
  ambarFundo: "#a85a0c",
  dourado: "rgba(214,167,91,.75)",
  metalClaro: "#f2d39a",
  metalEscuro: "#5e4521",
  neon: "#ff006e",
  trilho: "rgba(5,3,8,.82)",
}

// proporções do hud_partida.gd
const TALL = 1.5 // _RETRATO_ALTO
const ENTRA = 0.62 // _ENTRA
const SANGUE_CHAO = 0.95 // _LINHA_DO_SANGUE
const GROSSURA = 0.28
const GROSSURA_FOLEGO = 0.075
const QUEDA_MS = 140
const ESPERA_MS = 220
const ESCORRE_MS = 450

/** Largura do retrato pela tela (112 px no PC, ~52 px no celular) e a largura da tela. */
export function usePlateSize() {
  const calc = () =>
    typeof window === "undefined"
      ? { pw: 96, vw: 1280 }
      : { pw: Math.round(Math.max(52, Math.min(112, window.innerWidth * 0.07, window.innerHeight * 0.13))), vw: window.innerWidth }
  const [size, setSize] = useState(calc)
  useEffect(() => {
    const on = () => setSize(calc())
    window.addEventListener("resize", on)
    return () => window.removeEventListener("resize", on)
  }, [])
  return size
}

/** Largura total da placa (retrato que a barra invade + barra). */
export const plateWidth = (pw: number, barK = 2.9) => pw * ENTRA + pw * barK
/** Altura da placa com fôlego e poder. */
export const plateHeight = (pw: number) => pw * TALL * 1.1

export interface FightPlateProps {
  /** Largura do retrato em px (o resto sai dela). */
  pw: number
  /** Comprimento da barra em larguras de retrato (Cat demon: 3 no duelo, 2,75 no canto). */
  barK?: number
  mirrored?: boolean
  portrait?: string | null
  name: string
  hp: number
  hpMax: number
  /** Fôlego 0–1 (sem = a placa só tem o sangue, como no Paint). */
  stam?: number
  /** Terceira tira (o poder da Lâminas), 0–1; `ready` acende. */
  power?: { v: number; ready: boolean }
  /** Algo embaixo da placa (as vidas de cada lobo, o aviso do poder). */
  children?: ReactNode
  style?: CSSProperties
}

/** Paralelogramo do BarraEvo._forma, em px (c = h × corte). */
function shape(c: number, mirrored: boolean) {
  return mirrored ? `polygon(0 0, calc(100% - ${c}px) 0, 100% 100%, ${c}px 100%)` : `polygon(${c}px 0, 100% 0, calc(100% - ${c}px) 100%, 0 100%)`
}

function Bar({
  w,
  h,
  corte,
  f,
  ghost,
  mirrored,
  colors,
  ticks,
  glow,
}: {
  w: number
  h: number
  corte: number
  f: number
  ghost?: number
  mirrored: boolean
  colors: [string, string]
  ticks?: boolean
  glow?: boolean
}) {
  const c = h * corte
  const util = w - c
  const fillW = f > 0.001 ? util * f + c : 0
  const ghostW = ghost !== undefined && ghost > f ? util * ghost + c : fillW
  const side: CSSProperties = mirrored ? { right: 0 } : { left: 0 }
  const clip = shape(c, mirrored)
  // contorno e marcas (SVG por cima, nos px da barra)
  const pts = mirrored ? `0,0 ${w - c},0 ${w},${h} ${c},${h}` : `${c},0 ${w},0 ${w - c},${h} 0,${h}`
  return (
    <div className="absolute inset-0" style={{ filter: glow ? `drop-shadow(0 0 ${Math.max(4, h * 1.4)}px ${C.ambar})` : undefined }}>
      <div className="absolute inset-0" style={{ clipPath: clip, background: C.trilho }} />
      {ghost !== undefined && (
        <div
          className="absolute top-0 h-full"
          style={{ ...side, width: ghostW, clipPath: clip, background: "rgba(255,255,255,.75)", transition: `width ${ESCORRE_MS}ms cubic-bezier(.55,0,.9,.3)` }}
        />
      )}
      <div
        className="absolute top-0 h-full overflow-hidden"
        style={{ ...side, width: fillW, clipPath: clip, background: `linear-gradient(180deg, ${colors[0]}, ${colors[1]})`, transition: `width ${QUEDA_MS}ms linear` }}
      >
        {/* o vidro: filete claro no terço de cima */}
        <div className="absolute inset-x-0 top-0" style={{ height: "28%", background: "rgba(255,255,255,.22)" }} />
        {/* a ponta acesa */}
        {fillW > c * 1.5 && (
          <svg className="absolute top-0 h-full" width={c + 2} style={mirrored ? { left: 0 } : { right: 0 }} viewBox={`0 0 ${c + 2} ${h}`} aria-hidden>
            <line x1={mirrored ? 1 : c + 1} y1={0} x2={mirrored ? c + 1 : 1} y2={h} stroke="rgba(255,255,255,.9)" strokeWidth={2} />
          </svg>
        )}
      </div>
      <svg className="absolute inset-0 overflow-visible" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <polygon points={pts} fill="none" stroke={C.dourado} strokeWidth={1.5} strokeLinejoin="round" />
        {ticks &&
          [1, 2, 3].map((i) => {
            let mx = (util * i) / 4 + c * 0.5
            if (mirrored) mx = w - mx
            const dx = mirrored ? -c * 0.3 : c * 0.3
            return <line key={i} x1={mx} y1={h * 0.62} x2={mx - dx} y2={h} stroke="rgba(0,0,0,.5)" strokeWidth={1.5} />
          })}
      </svg>
    </div>
  )
}

/** O retrato: a carta chanfrada com moldura dourada e halo magenta. */
function Portrait({ pw, ph, src, mirrored }: { pw: number; ph: number; src?: string | null; mirrored: boolean }) {
  const ch = pw * 0.17 // 30 px de chanfro num retrato de 180
  const cut = (k: number) =>
    mirrored
      ? `polygon(0 0, 100% 0, 100% 100%, ${k}px 100%, 0 calc(100% - ${k}px))`
      : `polygon(0 0, 100% 0, 100% calc(100% - ${k}px), calc(100% - ${k}px) 100%, 0 100%)`
  const b = 2
  return (
    <div className="absolute top-0" style={{ width: pw, height: ph, [mirrored ? "right" : "left"]: 0, filter: `drop-shadow(0 0 ${Math.round(pw * 0.08)}px rgba(255,0,110,.55))` }}>
      <div className="absolute inset-0" style={{ clipPath: cut(ch), background: `linear-gradient(180deg, ${C.metalClaro}, ${C.metalEscuro})` }} />
      <div className="absolute overflow-hidden" style={{ inset: b, clipPath: cut(ch - b * 0.6), background: "linear-gradient(180deg, rgb(33,13,20), rgb(8,5,8))" }}>
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- retrato pequeno e estático do próprio jogo
          <img src={src} alt="" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: "50% 12%" }} />
        ) : (
          <VenetianMask className="absolute left-1/2 top-[34%] -translate-x-1/2" style={{ width: pw * 0.55, height: pw * 0.55, color: "rgba(245,241,237,.14)" }} />
        )}
        {/* o pé da foto escurece (o shader da moldura faz o mesmo) */}
        <div className="absolute inset-x-0 bottom-0" style={{ height: "45%", background: "linear-gradient(180deg, transparent, rgba(0,0,0,.45))" }} />
      </div>
      {/* a faixa neon junto do chanfro */}
      <svg className="absolute inset-0" width={pw} height={ph} viewBox={`0 0 ${pw} ${ph}`} aria-hidden>
        {mirrored ? (
          <line x1={ch * 0.35} y1={ph - ch - 3} x2={ch + 3} y2={ph - ch * 0.35} stroke={C.neon} strokeWidth={2.2} strokeLinecap="round" />
        ) : (
          <line x1={pw - ch * 0.35} y1={ph - ch - 3} x2={pw - ch - 3} y2={ph - ch * 0.35} stroke={C.neon} strokeWidth={2.2} strokeLinecap="round" />
        )}
      </svg>
    </div>
  )
}

export function FightPlate({ pw, barK = 2.9, mirrored = false, portrait, name, hp, hpMax, stam, power, children, style }: FightPlateProps) {
  const ph = pw * TALL
  const entra = pw * ENTRA
  const larg = pw * barK
  const total = entra + larg
  const altVida = ph * GROSSURA
  const altFolego = ph * GROSSURA_FOLEGO
  const chao = ph * SANGUE_CHAO
  const recuo = altVida * 0.42
  const xBarra = mirrored ? 0 : entra

  const max = Math.max(hpMax, 0.001)
  const v = Math.max(0, Math.min(hp, max))
  // O FANTASMA: fica no valor antigo e só escorre depois da espera. Cura sobe junto.
  const [ghost, setGhost] = useState(v)
  const [seen, setSeen] = useState(v)
  if (v !== seen) {
    setSeen(v)
    if (v >= ghost) setGhost(v)
  }
  useEffect(() => {
    if (ghost <= v) return
    const id = setTimeout(() => setGhost(v), QUEDA_MS + ESPERA_MS)
    return () => clearTimeout(id)
  }, [v, ghost])

  const low = v <= max * 0.34
  const folegoTop = chao + altFolego * 0.22
  const powerTop = folegoTop + altFolego * 1.55
  const height = Math.max(ph, (power ? powerTop : folegoTop) + altFolego + 2)
  const fora = pw + altFolego
  const passa = altVida * 0.34
  const numSize = altVida * 1.25

  return (
    <div className="pointer-events-none relative" style={{ width: total, ...style }}>
      <div className="relative" style={{ width: total, height }}>
        {/* o sangue */}
        <div className="absolute" style={{ left: xBarra, top: chao - altVida, width: larg, height: altVida }}>
          <Bar w={larg} h={altVida} corte={0.55} f={v / max} ghost={ghost / max} mirrored={mirrored} colors={low ? [C.perigo, C.ritualFundo] : [C.rosa, C.magentaFundo]} ticks />
        </div>
        {/* o fôlego, embaixo e recuado */}
        {stam !== undefined && (
          <div className="absolute" style={{ left: xBarra + (mirrored ? 0 : recuo), top: folegoTop, width: larg - recuo, height: altFolego }}>
            <Bar w={larg - recuo} h={altFolego} corte={1.6} f={Math.max(0, Math.min(1, stam))} mirrored={mirrored} colors={[C.ambar, C.ambarFundo]} />
          </div>
        )}
        {/* o poder (só a Lâminas): mais um degrau para dentro */}
        {power && (
          <div className="absolute" style={{ left: xBarra + (mirrored ? 0 : recuo * 2), top: powerTop, width: larg - recuo * 2, height: altFolego }}>
            <Bar w={larg - recuo * 2} h={altFolego} corte={1.6} f={Math.max(0, Math.min(1, power.v))} mirrored={mirrored} colors={["#b98aff", "#6a2bd6"]} glow={power.ready} />
          </div>
        )}
        {/* o nome, em pincel, pousado no alto da cunha (começa depois do retrato) */}
        <div
          className={`${knewave.className} absolute flex items-end overflow-hidden whitespace-nowrap uppercase leading-none`}
          style={{
            left: mirrored ? 0 : fora,
            top: chao - altVida - altVida * 0.8,
            width: total - fora,
            height: altVida * 0.78,
            justifyContent: mirrored ? "flex-end" : "flex-start",
            fontFamily: knewave.style.fontFamily,
            // nome comprido encolhe para caber (o Knewave tem ~0,62 em de largura por letra)
            fontSize: Math.max(9, Math.min(altVida * 0.52, (total - fora) / (Math.max(1, name.length) * 0.62))),
            color: "#f5f1ed",
            transform: "skewX(-7deg)",
            WebkitTextStroke: `${Math.max(2.5, altVida * 0.08)}px rgba(0,0,0,.9)`,
            paintOrder: "stroke fill",
          }}
        >
          {name}
        </div>
        {/* o número, grande, na ponta fina e passando dela */}
        <div
          className={`${anton.className} absolute flex items-center tabular-nums leading-none`}
          style={{
            left: xBarra - (mirrored ? passa : 0),
            top: chao - altVida * 0.5 - altVida,
            width: larg + passa,
            height: altVida * 2,
            justifyContent: mirrored ? "flex-start" : "flex-end",
            fontFamily: anton.style.fontFamily,
            fontSize: numSize,
            color: "#f5f1ed",
            transform: "skewX(-9deg)",
            WebkitTextStroke: `${Math.max(3, altVida * 0.1)}px rgba(0,0,0,.92)`,
            paintOrder: "stroke fill",
            textShadow: `0 0 ${Math.max(6, altVida * 0.18)}px rgba(255,0,110,.6)`,
          }}
        >
          {Math.round(v)}
        </div>
        {/* o retrato por cima de tudo: a barra parece SAIR dele */}
        <Portrait pw={pw} ph={ph} src={portrait} mirrored={mirrored} />
      </div>
      {children}
    </div>
  )
}
