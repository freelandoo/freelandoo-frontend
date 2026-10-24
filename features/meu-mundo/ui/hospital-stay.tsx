"use client"

// features/meu-mundo/ui/hospital-stay.tsx — a INTERNAÇÃO na tela (mm3d-26).
//
// Quem decide internar e dar alta é a vida do hóspede no servidor
// (meuMundoLife.js: saúde ≤ 15 interna, ≥ 60 dá alta). A sala recalcula a
// vida a cada minuto e avisa pelo socket ("life", com `status`); aqui só se
// mostra o que ela disse:
//   - internou com o jogo aberto → a AMBULÂNCIA (sirene, luz) e o leito;
//   - entrou já internado → direto no leito;
//   - alta → o leito solta e a porta do hospital volta para o jogo.
// A cena de baixo continua ligada (suspensa): é por ela que a alta chega.

import { useCallback, useEffect, useRef, useState } from "react"
import { Ambulance } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getHospital } from "../data"
import type { HospitalInfo, LifeSummary } from "../types"
import { EVO, teko } from "./status/evo-skin"

export type StayPhase = "ambulance" | "admitted" | "discharged"

const AMBULANCE_MS = 4200

export function useHospitalStay(initial: LifeSummary | null | undefined) {
  const [phase, setPhase] = useState<StayPhase | null>(initial?.character.status === "hospital" ? "admitted" : null)
  const [info, setInfo] = useState<HospitalInfo | null>(null)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  const refresh = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const r = await getHospital(token)
    if (!r.ok) return
    setInfo(r.data)
    if (r.data.life.character.status !== "hospital") setPhase((p) => (p === "admitted" ? "discharged" : p))
  }, [])

  /** Mensagem "life" da sala: internou agora (ambulância) ou mudou algo durante a internação. */
  const onLife = useCallback(
    (status: string | undefined) => {
      if (status === "hospital" && !phaseRef.current) {
        phaseRef.current = "ambulance"
        setPhase("ambulance")
      }
      if (phaseRef.current || status === "hospital") void refresh()
    },
    [refresh],
  )

  useEffect(() => {
    if (phase !== "ambulance") return
    const id = setTimeout(() => setPhase("admitted"), AMBULANCE_MS)
    return () => clearTimeout(id)
  }, [phase])

  useEffect(() => {
    if (phase && !info) void refresh()
  }, [phase, info, refresh])

  const close = useCallback(() => setPhase(null), [])
  return { phase, info, onLife, close }
}

/** Sirene de dois tons, baixa, que para sozinha (WebAudio; sem arquivo). */
function playSiren(ms: number) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return () => {}
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "triangle"
    gain.gain.value = 0.0001
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.3)
    for (let t = 0; t < ms / 1000; t += 0.9) {
      osc.frequency.setValueAtTime(960, ctx.currentTime + t)
      osc.frequency.setValueAtTime(770, ctx.currentTime + t + 0.45)
    }
    gain.gain.setValueAtTime(0.06, ctx.currentTime + ms / 1000 - 0.5)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + ms / 1000)
    return () => void ctx.close().catch(() => {})
  } catch {
    return () => {}
  }
}

/** A ambulância chegando: tela escura, giroflex e sirene, e o aviso. */
export function AmbulanceCurtain() {
  const t = useTranslations("MeuMundo")
  useEffect(() => playSiren(AMBULANCE_MS - 300), [])
  return (
    <div className="fl-sharp fixed inset-0 z-[75] flex flex-col items-center justify-center gap-5 px-6 text-center" style={{ background: EVO.preto }}>
      {/* Giroflex: só as duas barras piscam (animação pequena, nunca a tela inteira). */}
      <div className="flex gap-1" aria-hidden>
        <span className="mm-siren-a block h-5 w-16" style={{ background: "#e0352f" }} />
        <span className="mm-siren-b block h-5 w-16" style={{ background: "#3366f2" }} />
      </div>
      <Ambulance className="h-16 w-16" style={{ color: EVO.branco }} />
      <div role="status" className={`${teko.className} text-[30px] uppercase leading-none tracking-[0.1em]`} style={{ color: EVO.branco }}>
        {t("ambulanceTitle", "Ambulância a caminho")}
      </div>
      <p className="max-w-xs text-[14px]" style={{ color: EVO.mudo }}>
        {t("ambulanceDesc", "A saúde dele chegou ao limite. Ele vai ser internado no hospital do centro.")}
      </p>
      <style>{`
        @keyframes mm-siren { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0.15 } }
        .mm-siren-a { animation: mm-siren 0.5s steps(1) infinite; will-change: opacity }
        .mm-siren-b { animation: mm-siren 0.5s steps(1) infinite 0.25s; will-change: opacity }
        @media (prefers-reduced-motion: reduce) { .mm-siren-a, .mm-siren-b { animation: none } }
      `}</style>
    </div>
  )
}
