"use client"

// features/meu-mundo/ui/inbox/minigame-banter.tsx — o personagem fala DENTRO do minijogo.
//
// Pedido do Alex (2026-11-11): "não vai bater", "nossa, você é ruim de controle
// aí hein tio?!", "olha pra tela, para de conversar aí". Na rua a fala é o card
// do personagem; aqui o card está escondido, então a fala usa a MESMA moldura
// da notificação (retrato pela emoção), menor, no canto, e some sozinha. Só apresentação: a tela do minijogo avisa
// o que aconteceu (`emitMinigame`), este balão escolhe a fala pela personalidade
// e também percebe quando quem joga largou o controle (`mg_idle`).

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { BodyId } from "../../types"
import { IDLE_MS, MINIGAME_PACE, banterBody, banterGate, banterLine, emitBanter, emptyBanterMemory, isMinigameTopic, onBanter } from "../../banter"
import { currentSoul } from "../../soul"
import { emotionArt, type Emotion } from "../portraits"
import { EmotionFrame } from "./emotion-frame"
import { archivo } from "../status/evo-skin"

const SHOW_MS = 4_500

interface Said {
  id: number
  title: string
  emotion: Emotion
}

/** `running` = a partida está valendo (fora da contagem e do placar final). */
export function MinigameBanter({ running, body }: { running: boolean; body?: BodyId | null }) {
  const t = useTranslations("MeuMundo")
  const tRef = useRef(t)
  useEffect(() => {
    tRef.current = t
  }, [t])
  const [said, setSaid] = useState<Said | null>(null)
  const memory = useRef(emptyBanterMemory())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let seq = 0
    const off = onBanter((events) => {
      const soul = currentSoul()
      if (!soul) return
      const now = Date.now()
      for (const e of events) {
        if (!isMinigameTopic(e.topic)) continue
        const line = banterLine(soul.temper, e, tRef.current)
        if (!line || !banterGate(memory.current, e, now, MINIGAME_PACE)) continue
        const id = ++seq
        setSaid({ id, title: line.title, emotion: line.emotion })
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => setSaid((cur) => (cur?.id === id ? null : cur)), SHOW_MS)
        return
      }
    })
    return () => {
      off()
      if (timer) clearTimeout(timer)
    }
  }, [])

  // Largou o controle: nada apertado (dedo, mouse ou tecla) há IDLE_MS com a partida rodando.
  useEffect(() => {
    if (!running) return
    let last = Date.now()
    let pointers = 0
    const keys = new Set<string>()
    const touch = () => {
      last = Date.now()
    }
    const down = () => {
      pointers++
      touch()
    }
    const up = () => {
      pointers = Math.max(0, pointers - 1)
      touch()
    }
    const keyDown = (e: KeyboardEvent) => {
      keys.add(e.code)
      touch()
    }
    const keyUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
      touch()
    }
    const blur = () => {
      pointers = 0
      keys.clear()
    }
    const tick = setInterval(() => {
      if (pointers > 0 || keys.size > 0) {
        touch()
        return
      }
      if (Date.now() - last < IDLE_MS) return
      touch()
      emitBanter({ topic: "mg_idle" })
    }, 1_000)
    window.addEventListener("pointerdown", down, true)
    window.addEventListener("pointerup", up, true)
    window.addEventListener("pointercancel", up, true)
    window.addEventListener("pointermove", touch, true)
    window.addEventListener("keydown", keyDown, true)
    window.addEventListener("keyup", keyUp, true)
    window.addEventListener("blur", blur)
    return () => {
      clearInterval(tick)
      window.removeEventListener("pointerdown", down, true)
      window.removeEventListener("pointerup", up, true)
      window.removeEventListener("pointercancel", up, true)
      window.removeEventListener("pointermove", touch, true)
      window.removeEventListener("keydown", keyDown, true)
      window.removeEventListener("keyup", keyUp, true)
      window.removeEventListener("blur", blur)
    }
  }, [running])

  if (!said) return null
  // O mesmo card das notificações (retrato pela emoção), menor e no canto, sem botão de ação.
  return (
    <div className={`${archivo.className} pointer-events-none absolute left-0 z-30`} style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 84px)", paddingLeft: "max(8px, env(safe-area-inset-left))" }} role="status" aria-live="polite">
      <div style={{ transform: "scale(0.78)", transformOrigin: "top left" }}>
        <EmotionFrame key={said.id} message={said.title} art={emotionArt((body ?? banterBody()) as BodyId | null, said.emotion)} timerMs={SHOW_MS} closeLabel={t("close", "Fechar")} onClose={() => setSaid(null)} />
      </div>
    </div>
  )
}
