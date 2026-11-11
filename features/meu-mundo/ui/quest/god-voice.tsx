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
import { BASTOR_NAME_KEY, BRUTE_NAME_KEY, ECO_NAME_KEY, GOLEM_ARMED, GOLEM_CLOSE, GOLEM_LINES, GOLEM_NAME_KEY, VOICE_MS, bastorLines, bruteLine, clawAfterWin, clawWritings, ecoLine, voiceKeyFor, voiceNameKey, voiceOpen, type FightQuest, type VoiceGod } from "../../god-voice"
import { AE, chamfer } from "../kit/aether-tokens"
import { archivo } from "../status/evo-skin"
import TEXT from "./god-voice-text.json"

type T = (k: string, f: string) => string
const PT: Record<string, string[]> = TEXT
const tx = (t: T, key: string) => t(key, PT[key]?.[0] ?? key)

/** O capítulo muda devagar: uma consulta vale por CACHE_MS. */
const CACHE_MS = 5 * 60 * 1000
type Heard = { open: boolean; q: { chapter: number; locked: unknown } | null }
let cache: { at: number; got: Heard } | null = null
async function heard(): Promise<Heard> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.got
  const tk = getToken()
  if (!tk) return { open: false, q: null }
  const r = await getQuest(tk)
  const got: Heard = r.ok ? { open: voiceOpen(r.data.quest), q: r.data.quest } : { open: false, q: null }
  if (r.ok) cache = { at: Date.now(), got }
  return got
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
    void heard().then(({ open, q }) => {
      // C5: no cap. 8 Kragor fala de Pedraverde (voiceKeyFor)
      if (open && showing.current) setLine(voiceKeyFor(god, q))
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

/** O capítulo e a classe de quem luta (uma consulta por luta; falhou = ninguém fala). */
async function fightQuest(): Promise<{ q: FightQuest | null; clan: "raposa" | "vampiro" | null }> {
  const tk = getToken()
  const r = tk ? await getQuest(tk) : null
  return r && r.ok ? { q: r.data.quest, clan: r.data.clan } : { q: null, clan: null }
}

/**
 * C4 (cap. 6): o Eco da ponte fala quando a luta da Arena começa (`show` = a luta
 * começou), uma vez por luta, só no passo "ecos". Mesma moldura da voz dos deuses.
 */
export function EcoVoice({ show }: { show: boolean }) {
  const t = useTranslations("MeuMundo") as T
  const [line, setLine] = useState<string | null>(null)
  const spoke = useRef(false)

  useEffect(() => {
    if (!show || spoke.current) return
    spoke.current = true
    void fightQuest().then(({ q }) => setLine(ecoLine(q)))
  }, [show])

  useEffect(() => {
    if (!line) return
    const id = setTimeout(() => setLine(null), VOICE_MS)
    return () => clearTimeout(id)
  }, [line])

  if (!line || !show) return null
  return <VoiceBubble name={tx(t, ECO_NAME_KEY)} line={tx(t, line)} top={96} />
}

/**
 * C5 (cap. 8): o Brutamontes, no passo "campeao", diz uma frase quando a luta contra
 * ele começa (`show`), uma vez por luta. Mesma moldura da voz dos deuses.
 */
export function BruteVoice({ show }: { show: boolean }) {
  const t = useTranslations("MeuMundo") as T
  const [line, setLine] = useState<string | null>(null)
  const spoke = useRef(false)

  useEffect(() => {
    if (!show || spoke.current) return
    spoke.current = true
    void fightQuest().then(({ q }) => setLine(bruteLine(q)))
  }, [show])

  useEffect(() => {
    if (!line) return
    const id = setTimeout(() => setLine(null), VOICE_MS)
    return () => clearTimeout(id)
  }, [line])

  if (!line || !show) return null
  return <VoiceBubble name={tx(t, BRUTE_NAME_KEY)} line={tx(t, line)} top={96} />
}

/** Intervalo entre uma voz e a próxima, e quanto tempo o "FECHA." fica (ms). */
const GOLEM_STEP_MS = 900
const GOLEM_CLOSE_MS = 2_600
/** Onde cada balão cai (em % da largura útil e px do topo): sobrepostos, fora de ordem. */
const GOLEM_SPOTS = [
  { x: 4, y: 0, r: -2 },
  { x: 38, y: 46, r: 1.5 },
  { x: 10, y: 96, r: 1 },
  { x: 30, y: 140, r: -1.5 },
] as const

/**
 * C5 (cap. 8): as 180 vozes do Golem de Pedra, quando o SERVIDOR aceitou a chegada
 * (sem arma): balões sobrepostos em vozes diferentes (letra com leve tremor), um a
 * cada GOLEM_STEP_MS, e no fim todos ao mesmo tempo: "FECHA." em letra maior.
 * `armed` = chegou com arma: uma voz só, firme ("Larga o ferro ou volta.").
 * `run` muda a cada chegada (toca de novo). Sem botão; não bloqueia o toque.
 */
export function GolemVoices({ run, armed }: { run: number; armed: boolean }) {
  const t = useTranslations("MeuMundo") as T
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!run) return
    setN(0)
    if (armed) {
      const id = setTimeout(() => setN(99), VOICE_MS)
      return () => clearTimeout(id)
    }
    const ids = [...GOLEM_LINES.map((_, k) => setTimeout(() => setN(k + 1), GOLEM_STEP_MS * k)), setTimeout(() => setN(GOLEM_LINES.length + 1), GOLEM_STEP_MS * (GOLEM_LINES.length + 1)), setTimeout(() => setN(99), GOLEM_STEP_MS * (GOLEM_LINES.length + 1) + GOLEM_CLOSE_MS)]
    return () => ids.forEach(clearTimeout)
  }, [run, armed])

  if (!run || n >= 99) return null
  const name = tx(t, GOLEM_NAME_KEY)
  const card = { background: "rgba(13,15,19,0.66)", clipPath: chamfer(AE.cut.card), boxShadow: `inset 0 0 0 1px ${AE.brassLine}`, backdropFilter: "blur(6px)" }
  const top = "calc(max(12px, env(safe-area-inset-top)) + 96px)"
  const shake = `@keyframes mm-golem-shake { 0%,100% { transform: translate(0,0) } 25% { transform: translate(0.6px,-0.4px) } 50% { transform: translate(-0.5px,0.5px) } 75% { transform: translate(0.4px,0.3px) } }
@keyframes mm-golem-in { 0% { opacity: 0; transform: scale(0.96) } 100% { opacity: 1; transform: none } }`
  if (armed)
    return (
      <div className={`${archivo.className} pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-4`} style={{ top }} role="status" aria-live="polite">
        <div className="w-full max-w-[460px] px-4 py-3" style={{ ...card, animation: `mm-god-voice ${VOICE_MS}ms ${AE.ease} both` }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
            {name}
          </p>
          <p className="mt-1 text-[18px] font-bold leading-snug" style={{ color: AE.text }}>
            {tx(t, GOLEM_ARMED)}
          </p>
        </div>
        <style>{`@keyframes mm-god-voice { 0% { opacity: 0; transform: translateY(-8px) } 10% { opacity: 1; transform: none } 85% { opacity: 1 } 100% { opacity: 0 } }`}</style>
      </div>
    )
  const closing = n > GOLEM_LINES.length
  return (
    <div className={`${archivo.className} pointer-events-none fixed inset-x-0 z-[95] flex justify-center px-4`} style={{ top }} role="status" aria-live="polite">
      <div className="relative w-full max-w-[460px]" style={{ height: 210 }}>
        {closing ? (
          <div className="absolute inset-x-0 top-[40px] flex justify-center">
            <p className="px-6 py-3 text-[44px] font-black uppercase leading-none tracking-[0.12em]" style={{ ...card, color: AE.text, animation: `mm-golem-in 160ms ease-out both, mm-golem-shake 90ms linear infinite` }}>
              {tx(t, GOLEM_CLOSE)}
            </p>
          </div>
        ) : (
          GOLEM_LINES.slice(0, n).map((key, k) => {
            const s = GOLEM_SPOTS[k]
            return (
              <div key={key} className="absolute max-w-[70%] px-3 py-2" style={{ ...card, left: `${s.x}%`, top: s.y, rotate: `${s.r}deg`, animation: `mm-golem-in 220ms ease-out both` }}>
                {k === 0 && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: AE.goldSoft }}>
                    {name}
                  </p>
                )}
                <p className="text-[15px] italic leading-snug" style={{ color: AE.text, animation: `mm-golem-shake ${110 + k * 23}ms linear infinite` }}>
                  {tx(t, key)}
                </p>
              </div>
            )
          })
        )}
      </div>
      <style>{shake}</style>
    </div>
  )
}

/** Quanto tempo cada frase riscada fica na parede (ms). */
const CLAW_MS = 5_000

/**
 * C4 (cap. 7): a Dama das Garras escreve. Durante a luta (`fighting`), as duas frases
 * riscadas, uma depois da outra; depois da vitória (`won`), a terceira, pela classe.
 * Só no passo "telhados". PROVISÓRIO: letra riscada sobre uma faixa de pedra, até a
 * arte da parede com escrita de garra (Alex, roteiro §4).
 */
export function ClawWriting({ fighting, won }: { fighting: boolean; won: boolean }) {
  const t = useTranslations("MeuMundo") as T
  const [got, setGot] = useState<{ during: string[]; after: string | null } | null>(null)
  const [i, setI] = useState(0)
  const asked = useRef(false)

  useEffect(() => {
    if (!fighting || asked.current) return
    asked.current = true
    void fightQuest().then(({ q, clan }) => setGot({ during: clawWritings(q), after: clawAfterWin(q, clan) }))
  }, [fighting])

  useEffect(() => {
    if (!got || !fighting || i >= got.during.length) return
    const id = setTimeout(() => setI((n) => n + 1), CLAW_MS)
    return () => clearTimeout(id)
  }, [got, fighting, i])

  const key = won ? got?.after ?? null : fighting && got && i < got.during.length ? got.during[i] : null
  if (!key) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[96] flex justify-center px-4" style={{ top: "calc(max(12px, env(safe-area-inset-top)) + 96px)" }} role="status" aria-live="polite">
      <div
        key={key}
        className="w-full max-w-[520px] px-5 py-4 text-center"
        style={{
          background: "linear-gradient(180deg, rgba(58,52,60,0.9), rgba(30,26,34,0.9))",
          boxShadow: "inset 0 0 0 1px rgba(192,92,255,0.35), inset 0 -6px 18px rgba(0,0,0,0.5)",
          clipPath: chamfer(AE.cut.card),
          animation: `mm-claw ${CLAW_MS}ms ${AE.ease} both`,
        }}
      >
        <p
          className="text-[26px] font-black uppercase leading-tight tracking-[0.08em] sm:text-[32px]"
          style={{ color: "#E8D2FF", fontFamily: "Impact, 'Arial Narrow', sans-serif", transform: "rotate(-2deg) skewX(-8deg)", textShadow: "0 0 10px rgba(192,92,255,0.75), 2px 2px 0 rgba(0,0,0,0.6)" }}
        >
          {tx(t, key)}
        </p>
      </div>
      <style>{`@keyframes mm-claw { 0% { opacity: 0; clip-path: inset(0 100% 0 0) } 25% { opacity: 1; clip-path: inset(0 0 0 0) } 88% { opacity: 1 } 100% { opacity: ${won ? 1 : 0} } }`}</style>
    </div>
  )
}
