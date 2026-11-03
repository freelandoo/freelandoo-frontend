"use client"

// features/meu-mundo/ui/rewards/level-up.tsx — SUBIU DE NÍVEL (mm3d-60j, pedido do Alex).
//
// Nada de tela cheia. É a mesma linguagem do ganho de status, maior:
//  • no personagem (3D, engine/gain-pillar.ts → playLevelFx): VÁRIOS tubos de
//    luz nas cores de todos os status que sobem e somem rápido, brilhos no chão
//    de todas as cores e partículas brilhosas;
//  • na tela: "LEVEL UP" e o número do nível em letra grande, bold, branca,
//    com sombra SÓLIDA (sem desfoque) para baixo e para a esquerda a 18°;
//    não bloqueia o toque;
//  • e só um modal PEQUENO de notificação — fecha sozinho ou no X — com o
//    aumento de status do nível (2026-11-03: "todo level up tem um aumento de
//    status geral": vida, defesa, ataque e os 4 atributos — heroLevelScale) e
//    o que o nível liberou, se liberou algo.
// Movimento reduzido: o texto aparece sem salto (o 3D já sai no nível baixo).

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { playLevelFx } from "../../engine/gain-pillar"
import { screenAnchor } from "../../engine/screen-anchor"
import { SteamFrame } from "../kit/steam/steam-frame"
import { FLOAT_COLOR } from "../kit/steam/steam-tokens"
import { archivo, cinzel, teko } from "../status/evo-skin"
import l from "./level-up.module.css"
import { heroLevelScale } from "../../laminas/sim/fight"
import { useLocale } from "@/components/i18n/I18nProvider"

type T = (k: string, f: string) => string

const TEXT_MS = 2600
const NOTE_IN_MS = 900
const NOTE_MS = 6500

/** Cores de todos os status (os tubos e os brilhos do chão). */
const ALL_COLORS = Object.values(FLOAT_COLOR) as string[]

export function LevelUp({ from, to, unlocks, reduce, t, onClose }: { from: number; to: number; unlocks: string[]; reduce: boolean; t: T; onClose: () => void }) {
  const locale = useLocale()
  const [text, setText] = useState(true)
  const [note, setNote] = useState(false)
  const [noteDone, setNoteDone] = useState(false)

  // 2026-11-03 (Alex): o texto fica EM CIMA DO PERSONAGEM, como os números de
  // status — a camada segue a cabeça (screen-anchor) enquanto o texto vive.
  const anchor = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!text) return
    let raf = 0
    const tick = () => {
      const el = anchor.current
      if (el) {
        const w = window.innerWidth
        const h = window.innerHeight
        const a = screenAnchor()
        const box = el.firstElementChild as HTMLElement | null
        const tall = box?.offsetHeight ?? 0
        // inteiro dentro da tela (personagem perto da borda): meia largura de folga
        const half = Math.min(w / 2, (box?.offsetWidth ?? 80) / 2 + 8)
        const x = Math.min(w - half, Math.max(half, a ? a.x : w / 2))
        const y = Math.min(h - 20, Math.max(tall + 16, a ? a.y - 8 : h * 0.42))
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [text])

  // o feixe no personagem (uma vez)
  useEffect(() => {
    playLevelFx(ALL_COLORS)
  }, [])

  useEffect(() => {
    const a = setTimeout(() => setText(false), TEXT_MS)
    const b = setTimeout(() => setNote(true), NOTE_IN_MS)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])

  useEffect(() => {
    if (!note) return
    const id = setTimeout(() => {
      setNote(false)
      setNoteDone(true)
    }, NOTE_MS)
    return () => clearTimeout(id)
  }, [note])

  // acabou o texto e a notificação → avisa o pai
  useEffect(() => {
    if (!text && noteDone && !note) onClose()
  }, [text, note, noteDone, onClose])

  // o que o(s) nível(is) somou
  const a = heroLevelScale(from)
  const b = heroLevelScale(to)
  const pct = (v: number) => (Math.round(v * 1000) / 10).toLocaleString(locale, { maximumFractionDigits: 1 })
  const gains: [string, string][] = [
    [t("levelUpGainHp", "+{n} de vida máxima (HP)").replace("{n}", String(b.hp - a.hp)), "#FF3B4E"],
    ...(b.def > a.def ? ([[t("levelUpGainDef", "+{n}% de defesa").replace("{n}", pct(b.def - a.def)), "#8FB8FF"]] as [string, string][]) : []),
    [t("levelUpGainAtk", "+{n}% de ataque").replace("{n}", pct(b.dmg - a.dmg)), "#FF9F45"],
    [t("levelUpGainAttr", "+{n} em força, velocidade, inteligência e destreza").replace("{n}", String(b.attr - a.attr)), "#FFD23F"],
  ]

  const closeNote = () => {
    setNote(false)
    setNoteDone(true)
  }

  return (
    <>
      <p className="sr-only" role="status">
        {t("levelUpAria", "Subiu para o nível {n}").replace("{n}", String(to))}
      </p>
      <div ref={anchor} className={l.anchor} aria-hidden style={{ transform: "translate3d(-999px,-999px,0)" }}>
        <AnimatePresence>
          {text && (
            <motion.div
              aria-hidden
              className={`${teko.className} ${l.big}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, y: 10 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: [0.35, 1.18, 1], y: [10, 0, -36] }}
              exit={{ opacity: 0, y: -60 }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { duration: TEXT_MS / 1000, times: [0, 0.08, 1], ease: [0.22, 1, 0.36, 1], opacity: { duration: 0.18 } }
              }
            >
            <span className={l.title}>
              {t("levelUpBig", "LEVEL UP")}
              <span className={l.glare}>{t("levelUpBig", "LEVEL UP")}</span>
            </span>
            <motion.span
              className={l.num}
              initial={reduce ? false : { scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 13, delay: reduce ? 0 : 0.25 }}
            >
              {to - from > 1 ? `${from} → ${to}` : to}
              <span className={l.glare}>{to - from > 1 ? `${from} → ${to}` : to}</span>
            </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {note && (
          <motion.div
            role="dialog"
            aria-modal="false"
            aria-labelledby="mm-levelup-note"
            className={l.note}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <SteamFrame cornerSize={26} ignite={!reduce}>
              <div className="relative px-4 pb-3 pt-2.5">
                <div className={`${archivo.className} text-[10px] font-semibold uppercase tracking-[0.2em]`} style={{ color: "#FFB347" }}>
                  {t("levelUpNoteEyebrow", "Nível {n}").replace("{n}", String(to))}
                </div>
                <h3 id="mm-levelup-note" className={`${cinzel.className} pr-8 text-[15px] font-bold uppercase leading-tight tracking-[0.05em]`} style={{ color: "#FFD68A", textShadow: "0 2px 0 #000" }}>
                  {t("levelUpStatsTitle", "Status aumentaram")}
                </h3>
                <ul className={`${archivo.className} mt-1.5 space-y-0.5 text-[13px] font-semibold`} style={{ color: "#F3EFE6" }}>
                  {gains.map(([g, c]) => (
                    <li key={g} className="flex items-center gap-2">
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: c }} />
                      {g}
                    </li>
                  ))}
                </ul>
                {unlocks.length > 0 && (
                  <>
                    <div className={`${cinzel.className} mt-2 text-[13px] font-bold uppercase tracking-[0.05em]`} style={{ color: "#FFD68A", textShadow: "0 2px 0 #000" }}>
                      {t("levelUpNoteTitle", "Novo acesso liberado")}
                    </div>
                    <ul className={`${archivo.className} mt-1 space-y-0.5 text-[13px] font-semibold`} style={{ color: "#F3EFE6" }}>
                      {unlocks.map((u) => (
                        <li key={u} className="flex items-center gap-2">
                          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: "#FFD23F" }} />
                          {t(`unlock_${u}`, u)}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <button type="button" onClick={closeNote} aria-label={t("close", "Fechar")} className={l.close}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SteamFrame>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
