"use client"

// features/meu-mundo/ui/story/story-scene.tsx — a CENA DE HISTÓRIA feita no motor
// (apresentação 16 · Anexo A §8). A tela por cima dos planos de câmera:
//
//   · legenda centrada embaixo, SEM caixa (só sombra), uma frase por vez; o nome de quem
//     fala em 11 px acima (narração = sem nome);
//   · "Pular" no canto de cima à direita (alvo 44 px; Esc também pula);
//   · LEMBRANÇA = cor chapada (vermelho) + silhueta preta (o desenho 2D do Alex entra no
//     lugar do provisório — `art`), com corte seco de entrada e de saída;
//   · fecha com o último plano e escurece em 0,4 s.
//
// O roteiro é uma lista de batidas; a cada batida a tela chama `onShot` (o motor corta o
// plano) e, no fim ou no Pular, `onDone`. Custo: DOM parado + o desfoque do motor (fora do
// low), só enquanto a cena roda.

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { StoryShot } from "../../engine/story-camera"
import { TAP, TX, TYPE } from "../kit/type-scale"
import { anton } from "../hud/fight-plate"
import { archivo } from "../status/evo-skin"

type Tr = (k: string, fb: string) => string

export interface StoryBeat {
  /** Plano do motor; null = lembrança (a tela cobre o motor). */
  shot: StoryShot | null
  ms: number
  /** Fala: chave i18n + texto pt; `who` = chave do nome (sem = narração). */
  line?: { key: string; fb: string; who?: { key: string; fb: string } }
  /** Fala em letreiro (40 px, tremendo) — o grito que fecha a cena. */
  shout?: boolean
  /** Lembrança: qual desenho (provisório em SVG até a arte do Alex). */
  memory?: "pedraverde"
}

const FADE_MS = 400
/** Vermelho chapado da lembrança (a cor que "marca", Anexo A §8). */
const MEMORY_RED = "#C4122F"

export function StoryScene({ beats, onShot, onDone }: { beats: StoryBeat[]; onShot: (shot: StoryShot | null) => void; onDone: () => void }) {
  const t = useTranslations("MeuMundo") as Tr
  const [i, setI] = useState(0)
  const [closing, setClosing] = useState(false)
  const done = useRef(false)
  const shotRef = useRef(onShot)
  const doneRef = useRef(onDone)
  useEffect(() => {
    shotRef.current = onShot
    doneRef.current = onDone
  })

  const finish = () => {
    if (done.current) return
    done.current = true
    setClosing(true)
    setTimeout(() => {
      shotRef.current(null)
      doneRef.current()
    }, FADE_MS)
  }

  // cada batida: corta o plano (a lembrança mantém o último plano por baixo) e agenda a próxima
  useEffect(() => {
    if (done.current) return
    const b = beats[i]
    if (!b) return finish()
    if (b.shot) shotRef.current(b.shot)
    const id = setTimeout(() => (i + 1 < beats.length ? setI(i + 1) : finish()), b.ms)
    return () => clearTimeout(id)
  }, [i, beats])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const b = beats[Math.min(i, beats.length - 1)]
  const who = b.line?.who ? t(b.line.who.key, b.line.who.fb) : null
  const text = b.line ? t(b.line.key, b.line.fb) : null
  return (
    <div className={`${archivo.className} fixed inset-0 z-[96] select-none`} role="dialog" aria-modal="true" aria-label={t("storyAria", "Cena da história")}>
      <style>{STORY_CSS}</style>
      {b.memory && <Memory art={b.memory} key={`m${i}`} />}
      {/* sombra só no pé, para a legenda ler sobre qualquer plano */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%]" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 100%)" }} />
      {text && (
        <div key={`l${i}`} className="mmst-line absolute inset-x-0 flex flex-col items-center px-6 text-center" style={{ bottom: "max(56px, calc(env(safe-area-inset-bottom) + 40px))" }} aria-live="polite">
          {who && (
            <span className={`${TX.label} mb-1 font-bold uppercase tracking-[0.2em]`} style={{ color: "#FFD68A", textShadow: "0 1px 0 #000, 0 0 8px #000" }}>
              {who}
            </span>
          )}
          {b.shout ? (
            <span className={`${anton.className} mmst-shout uppercase leading-none tracking-[0.1em]`} style={{ fontFamily: anton.style.fontFamily, fontSize: TYPE.banner, color: "#FFF4DC", textShadow: "0 3px 0 #000, 0 0 14px #000" }}>
              {text}
            </span>
          ) : (
            <span className={`${TX.title} max-w-[560px] font-semibold`} style={{ color: "#FFFFFF", textShadow: "0 2px 0 #000, 0 0 10px rgba(0,0,0,0.9)" }}>
              {text}
            </span>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={finish}
        className={`${TX.label} absolute flex items-center justify-center px-3 font-bold uppercase tracking-[0.18em] transition-transform duration-100 active:scale-[0.95]`}
        style={{ top: "max(8px, env(safe-area-inset-top))", right: 8, minWidth: TAP, height: TAP, color: "#F4EEDF", textShadow: "0 1px 0 #000" }}
      >
        {t("storySkip", "Pular")} ›
      </button>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: closing ? 1 : 0, transition: `opacity ${FADE_MS}ms linear` }} />
    </div>
  )
}

const STORY_CSS = `
@keyframes mmst-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes mmst-shake { 0%,100% { transform: translate(0,0) } 25% { transform: translate(1px,-1px) } 50% { transform: translate(-1px,1px) } 75% { transform: translate(1px,1px) } }
.mmst-line { animation: mmst-in .22s cubic-bezier(.22,1,.36,1) both }
.mmst-shout { display: inline-block; animation: mmst-shake 90ms linear infinite }
:root[data-mm-fx="low"] .mmst-line, :root[data-mm-fx="low"] .mmst-shout { animation: none }
@media (prefers-reduced-motion: reduce) { .mmst-line, .mmst-shout { animation: none } }
`

/** A lembrança: cor chapada + silhueta. Provisório em SVG até o desenho do Alex. */
function Memory({ art }: { art: "pedraverde" }) {
  return (
    <div aria-hidden className="absolute inset-0" style={{ background: MEMORY_RED }}>
      <div className="absolute inset-x-0 bottom-[30%] flex justify-center">{ART[art]}</div>
    </div>
  )
}

/**
 * Pedraverde (Arquivo): a vila de Raposas que não escolheu lado; na última noite, os
 * adultos viram muralha. Silhueta: uma fileira de Raposas de pé, de costas, cujos corpos
 * se fundem num muro de pedras.
 */
const ART: Record<"pedraverde", ReactNode> = {
  pedraverde: (
    <svg viewBox="0 0 400 200" className="w-[min(92vw,640px)]" fill="#0B0607">
      {/* o muro: pedras irregulares que sobem para dentro das figuras */}
      <path d="M0 200 V150 L18 146 L40 150 L62 144 L88 149 L112 143 L140 148 L166 142 L194 147 L220 141 L248 147 L274 142 L300 148 L326 143 L352 149 L378 144 L400 148 V200 Z" />
      {Array.from({ length: 9 }, (_, k) => {
        const x = 24 + k * 44
        const h = 70 + ((k * 37) % 23)
        const y = 150 - h
        return (
          <g key={k}>
            {/* corpo e cabeça */}
            <path d={`M${x - 15} 152 C${x - 16} ${y + 40} ${x - 12} ${y + 22} ${x} ${y + 18} C${x + 12} ${y + 22} ${x + 16} ${y + 40} ${x + 15} 152 Z`} />
            <circle cx={x} cy={y + 12} r={11} />
            {/* orelhas de Raposa */}
            <path d={`M${x - 10} ${y + 6} L${x - 7} ${y - 12} L${x - 1} ${y + 2} Z M${x + 10} ${y + 6} L${x + 7} ${y - 12} L${x + 1} ${y + 2} Z`} />
          </g>
        )
      })}
      {/* as juntas do muro passando pelas pernas */}
      <path d="M0 172 H400 M0 188 H400" stroke={MEMORY_RED} strokeWidth="2" opacity="0.55" />
    </svg>
  ),
}
