"use client"

// features/meu-mundo/ui/hud/drawer-machine.tsx — a MÁQUINA do menu lateral (mm3d-60c).
//
// Pedido do Alex (referência "O BAIRRO" em prata + azul metálico): relógio
// mecânico com a hora de verdade, engrenagens engrenadas atrás dele, a câmara
// de energia azul na lateral e o cano que desce até o rodapé. Tudo SVG/CSS
// decorativo (aria-hidden), sem render loop: o relógio acerta os ponteiros
// uma vez por segundo SÓ com o menu aberto; engrenagens e energia são
// animações CSS pausadas com o menu fechado (e desligadas com gráficos baixos).

import { useEffect, useId, useRef } from "react"
import { gearPath } from "../kit/steam/steam-frame"
import d from "./drawer.module.css"

const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"]

/** Relógio analógico com a hora local do aparelho. */
function Clock({ open }: { open: boolean }) {
  const id = useId().replace(/:/g, "")
  const hRef = useRef<SVGGElement | null>(null)
  const mRef = useRef<SVGGElement | null>(null)
  const sRef = useRef<SVGGElement | null>(null)
  useEffect(() => {
    const set = () => {
      const now = new Date()
      const s = now.getSeconds()
      const m = now.getMinutes() + s / 60
      const h = (now.getHours() % 12) + m / 60
      hRef.current?.setAttribute("transform", `rotate(${h * 30} 50 50)`)
      mRef.current?.setAttribute("transform", `rotate(${m * 6} 50 50)`)
      sRef.current?.setAttribute("transform", `rotate(${s * 6} 50 50)`)
    }
    set()
    if (!open) return
    const t = setInterval(set, 1000)
    return () => clearInterval(t)
  }, [open])
  return (
    <svg viewBox="0 0 100 100" className={d.clock}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3CF" />
          <stop offset="0.35" stopColor="#D9A24E" />
          <stop offset="0.6" stopColor="#8A5A1E" />
          <stop offset="1" stopColor="#E8B65B" />
        </linearGradient>
        <radialGradient id={`f${id}`} cx="0.45" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FBF6EA" />
          <stop offset="0.7" stopColor="#EADFC4" />
          <stop offset="1" stopColor="#C9B48A" />
        </radialGradient>
      </defs>
      {/* aro prateado, anel grafite com marcas azuis, rebites */}
      <circle cx="50" cy="50" r="49" fill={`url(#b${id})`} stroke="#1A222B" strokeWidth="1" />
      <circle cx="50" cy="50" r="44" fill="#121A23" stroke="#20D9E9" strokeOpacity="0.55" strokeWidth="1" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return <circle key={i} cx={50 + Math.sin(a) * 46.5} cy={50 - Math.cos(a) * 46.5} r="1.1" fill="#FFD68A" />
      })}
      <circle cx="50" cy="50" r="40" fill={`url(#f${id})`} stroke="#9A6424" strokeWidth="1" />
      {/* marcas dos minutos */}
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2
        const r0 = i % 5 === 0 ? 34.5 : 36.5
        return <line key={i} x1={50 + Math.sin(a) * r0} y1={50 - Math.cos(a) * r0} x2={50 + Math.sin(a) * 38.5} y2={50 - Math.cos(a) * 38.5} stroke="#2A3440" strokeWidth={i % 5 === 0 ? 1.1 : 0.45} />
      })}
      {ROMAN.map((r, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <text key={r} x={50 + Math.sin(a) * 28} y={50 - Math.cos(a) * 28 + 2.6} textAnchor="middle" fontSize={r.length > 2 ? 6 : 7} fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" fill="#1B232C">
            {r}
          </text>
        )
      })}
      {/* engrenagem gravada no miolo */}
      <path d={gearPath(50, 50, 10, 9, 7)} fill="none" stroke="#9A6424" strokeWidth="0.7" />
      <g ref={hRef}>
        <path d="M48.6 52 L50 29 L51.4 52 Z" fill="#1F2933" />
      </g>
      <g ref={mRef}>
        <path d="M49.2 53 L50 17 L50.8 53 Z" fill="#1F2933" />
      </g>
      <g ref={sRef}>
        <line x1="50" y1="56" x2="50" y2="15" stroke="#20D9E9" strokeWidth="0.8" />
      </g>
      <circle cx="50" cy="50" r="3.2" fill="#E8B65B" stroke="#1A222B" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="1.3" fill="#20D9E9" />
      {/* reflexo frio no vidro */}
      <path d="M22 34 A32 32 0 0 1 58 16" fill="none" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** Engrenagem de aço (prata escura com miolo azul). */
function SteelGear({ teeth, r, className }: { teeth: number; r: number; className: string }) {
  const id = useId().replace(/:/g, "")
  const ri = r - 4.2
  return (
    <svg viewBox={`${-r - 1} ${-r - 1} ${2 * r + 2} ${2 * r + 2}`} className={className}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE3A3" />
          <stop offset="0.45" stopColor="#9A6424" />
          <stop offset="1" stopColor="#3A250C" />
        </linearGradient>
      </defs>
      <g className={d.spinBox}>
        <path d={gearPath(0, 0, teeth, r, ri)} fill={`url(#g${id})`} stroke="#11181F" strokeWidth="0.9" />
        <circle r={ri - 3} fill="#1A222B" stroke="#C8913F" strokeWidth="0.9" />
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2
          return <line key={i} x1="0" y1="0" x2={Math.cos(a) * (ri - 3)} y2={Math.sin(a) * (ri - 3)} stroke="#9A6424" strokeWidth={r > 20 ? 3.2 : 2.2} />
        })}
        <circle r={r * 0.22} fill="#E8B65B" stroke="#11181F" strokeWidth="0.8" />
        <circle r={r * 0.09} fill="#20D9E9" />
      </g>
    </svg>
  )
}

export function DrawerMachine({ open }: { open: boolean }) {
  return (
    <div className={d.machine} aria-hidden>
      {/* trem de engrenagens atrás do relógio (as duas engrenadas giram em sentidos opostos) */}
      <SteelGear teeth={14} r={30} className={`${d.gear} ${d.gearA}`} />
      <SteelGear teeth={10} r={22} className={`${d.gear} ${d.gearB}`} />
      <div className={d.clockBox}>
        <Clock open={open} />
      </div>
      {/* câmara de energia */}
      <div className={d.tube}>
        <span className={d.tubeCap} />
        <span className={d.tubeGlass}>
          <span className={d.tubeFlow} />
          <span className={d.tubeShine} />
          <span className={d.tubeBand} style={{ top: "22%" }} />
          <span className={d.tubeBand} style={{ top: "76%" }} />
          <svg viewBox="0 0 20 44" className={d.tubeCore}>
            <path d="M10 1 18 22 10 43 2 22Z" fill="#5FE9F5" />
            <path d="M10 1 12.5 22 10 43" fill="#E9FDFF" fillOpacity="0.7" />
            <path d="M2 22 18 22" stroke="#E9FDFF" strokeOpacity="0.6" strokeWidth="0.6" />
          </svg>
        </span>
        <span className={`${d.tubeCap} ${d.tubeCapB}`} />
      </div>
      {/* cano até o rodapé + engrenagem de baixo */}
      <svg viewBox="0 0 60 110" className={d.pipe}>
        <path d="M29 0 V64 Q29 90 52 90 H60" fill="none" stroke="#0B1016" strokeWidth="9" />
        <path d="M29 0 V64 Q29 90 52 90 H60" fill="none" stroke="#C8913F" strokeWidth="6" />
        <path d="M27.4 0 V64 Q27.4 91.6 52 91.6 H60" fill="none" stroke="#FFD68A" strokeOpacity="0.7" strokeWidth="1.3" />
        <rect x="22" y="30" width="14" height="7" fill="#E8B65B" stroke="#11181F" strokeWidth="0.8" />
        <rect x="22" y="31.6" width="14" height="1.4" fill="#20D9E9" />
      </svg>
      <SteelGear teeth={12} r={26} className={`${d.gear} ${d.gearC}`} />
    </div>
  )
}
