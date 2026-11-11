"use client"

// features/meu-mundo/ui/quest/god-voice.tsx — lore v2 C2: a voz do deus no fim da partida.
//
// `show` vira true quando a tela do minijogo mostra o placar final; aí, se quem
// joga já está no cap. 3 (ou depois), o deus daquele jogo diz UMA fala sorteada,
// por cima do placar, por VOICE_MS. Uma vez por partida: só volta a falar depois
// que `show` desce (jogar de novo). Sem áudio, sem botão, não bloqueia o toque.
// O capítulo vem do GET /quest (guardado alguns minutos para não pedir a cada partida).

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { getQuest } from "../../data"
import { BASTOR_NAME_KEY, VOICE_MS, bastorLines, voiceKey, voiceNameKey, voiceOpen, type VoiceGod } from "../../god-voice"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo } from "../status/evo-skin"
import TEXT from "./god-voice-text.json"

type T = (k: string, f: string) => string
const PT: Record<string, string[]> = TEXT
const tx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)

/** O capítulo muda devagar: uma consulta vale por CACHE_MS. */
const CACHE_MS = 5 * 60 * 1000
let cache: { at: number; open: boolean } | null = null
async function heard(): Promise<boolean> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.open
  const tk = getToken()
  if (!tk) return false
  const r = await getQuest(tk)
  const open = r.ok ? voiceOpen(r.data.quest) : false
  if (r.ok) cache = { at: Date.now(), open }
  return open
}

/** O balão (mesma moldura da voz dos deuses). `top` = distância do topo da tela (px). */
function VoiceBubble({ name, line, top }: { name: string; line: string; top: number }) {
  return (
    <div
      className={`${archivo.className} pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-4`}
      style={{ top: `calc(max(12px, env(safe-area-inset-top)) + ${top}px)` }}
      role="status"
      aria-live="polite"
    >
      <div
        key={line}
        className="w-full max-w-[460px] px-4 py-3"
        style={{
          background: "rgba(13,15,19,0.62)",
          clipPath: chamfer(AE.cut.card),
          boxShadow: `inset 0 0 0 1px ${AE.brassLine}`,
          backdropFilter: "blur(6px)",
          animation: `mm-god-voice ${VOICE_MS}ms ${AE.ease} both`,
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
          {name}
        </p>
        <p className="mt-1 text-[16px] italic leading-snug" style={{ color: AE.text }}>
          {line}
        </p>
      </div>
      <style>{`@keyframes mm-god-voice { 0% { opacity: 0; transform: translateY(-8px) } 10% { opacity: 1; transform: none } 85% { opacity: 1 } 100% { opacity: 0 } }`}</style>
    </div>
  )
}

/**
 * C3 (cap. 5): Bastor fala quando quem joga chega à ilha dele no Paint (`show` =
 * a pessoa está na ilha do Guardião). Uma vez por subida; cada fala fica VOICE_MS.
 * Desce abaixo da placa de vida do Guardião (que ocupa o topo na luta).
 */
export function BastorVoice({ show }: { show: boolean }) {
  const t = useTranslations("MeuMundo") as T
  const [lines, setLines] = useState<string[]>([])
  const [i, setI] = useState(0)
  const spoke = useRef(false)

  useEffect(() => {
    if (!show) {
      spoke.current = false
      return
    }
    if (spoke.current) return
    spoke.current = true
    const tk = getToken()
    void (tk ? getQuest(tk) : Promise.resolve(null)).then((r) => {
      setI(0)
      setLines(bastorLines(r && r.ok ? r.data.quest : null))
    })
  }, [show])

  useEffect(() => {
    if (i >= lines.length) return
    const id = setTimeout(() => setI((n) => n + 1), VOICE_MS)
    return () => clearTimeout(id)
  }, [i, lines])

  if (!show || i >= lines.length) return null
  return <VoiceBubble name={tx(t, BASTOR_NAME_KEY)} line={tx(t, lines[i])} top={96} />
}

export function GodVoice({ god, show }: { god: VoiceGod; show: boolean }) {
  const t = useTranslations("MeuMundo") as T
  const [line, setLine] = useState<string | null>(null)
  const spoke = useRef(false)
  const showing = useRef(show)

  useEffect(() => {
    showing.current = show
    if (!show) {
      spoke.current = false // a próxima partida pode ouvir de novo
      return
    }
    if (spoke.current) return
    spoke.current = true
    void heard().then((open) => {
      if (open && showing.current) setLine(voiceKey(god))
    })
  }, [show, god])

  // some sozinha
  useEffect(() => {
    if (!line) return
    const id = setTimeout(() => setLine(null), VOICE_MS)
    return () => clearTimeout(id)
  }, [line])

  if (!line || !show) return null
  return <VoiceBubble name={tx(t, voiceNameKey(god))} line={tx(t, line)} top={6} />
}
