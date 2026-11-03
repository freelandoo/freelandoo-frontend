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
//  • e só um modal PEQUENO de notificação com o que o nível liberou (se
//    liberou algo) — fecha sozinho ou no X.
// Movimento reduzido: o texto aparece sem salto (o 3D já sai no nível baixo).

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { playLevelFx } from "../../engine/gain-pillar"
import { anton } from "../hud/fight-plate"
import { SteamFrame } from "../kit/steam/steam-frame"
import { FLOAT_COLOR } from "../kit/steam/steam-tokens"
import { archivo, cinzel } from "../status/evo-skin"
import l from "./level-up.module.css"

type T = (k: string, f: string) => string

const TEXT_MS = 2600
const NOTE_IN_MS = 900
const NOTE_MS = 6500

/** Cores de todos os status (os tubos e os brilhos do chão). */
const ALL_COLORS = Object.values(FLOAT_COLOR) as string[]

export function LevelUp({ from, to, unlocks, reduce, t, onClose }: { from: number; to: number; unlocks: string[]; reduce: boolean; t: T; onClose: () => void }) {
  const [text, setText] = useState(true)
  const [note, setNote] = useState(false)
  const [noteDone, setNoteDone] = useState(!unlocks.length)

  // o feixe no personagem (uma vez)
  useEffect(() => {
    playLevelFx(ALL_COLORS)
  }, [])

  useEffect(() => {
    const a = setTimeout(() => setText(false), TEXT_MS)
    const b = unlocks.length ? setTimeout(() => setNote(true), NOTE_IN_MS) : null
    return () => {
      clearTimeout(a)
      if (b) clearTimeout(b)
    }
  }, [unlocks.length])

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

  const closeNote = () => {
    setNote(false)
    setNoteDone(true)
  }

  return (
    <>
      <p className="sr-only" role="status">
        {t("levelUpAria", "Subiu para o nível {n}").replace("{n}", String(to))}
      </p>
      <AnimatePresence>
        {text && (
          <motion.div
            aria-hidden
            className={`${anton.className} ${l.big}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={reduce ? { duration: 0.2 } : { type: "spring", stiffness: 320, damping: 17 }}
          >
            <span className={l.title}>{t("levelUpBig", "LEVEL UP")}</span>
            <motion.span
              className={l.num}
              initial={reduce ? false : { scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 13, delay: reduce ? 0 : 0.25 }}
            >
              {to - from > 1 ? `${from} → ${to}` : to}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>
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
                <div className={`${archivo.className} text-[10px] font-semibold uppercase tracking-[0.2em]`} style={{ color: "#5fe9f5" }}>
                  {t("levelUpNoteEyebrow", "Nível {n}").replace("{n}", String(to))}
                </div>
                <h3 id="mm-levelup-note" className={`${cinzel.className} pr-8 text-[15px] font-bold uppercase leading-tight tracking-[0.05em]`} style={{ color: "#FFD68A", textShadow: "0 2px 0 #000" }}>
                  {t("levelUpNoteTitle", "Novo acesso liberado")}
                </h3>
                <ul className={`${archivo.className} mt-1.5 space-y-0.5 text-[13px] font-semibold`} style={{ color: "#F3EFE6" }}>
                  {unlocks.map((u) => (
                    <li key={u} className="flex items-center gap-2">
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: "#FFD23F" }} />
                      {t(`unlock_${u}`, u)}
                    </li>
                  ))}
                </ul>
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
