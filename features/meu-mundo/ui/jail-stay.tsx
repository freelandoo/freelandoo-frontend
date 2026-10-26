"use client"

// features/meu-mundo/ui/jail-stay.tsx — a PRISÃO na tela (mm3d-37f).
//
// Quem prende e solta é a vida no servidor (meuMundoLife.js `crime`: dirigir
// na praça pela 2ª vez no dia ou atropelar alguém = atividade "jail" por
// alguns minutos). A sala do centro vê o crime, tira a pessoa do carro, leva
// à porta da delegacia e avisa ("crime"); a vida chega no "life" com
// `activity: "jail"` e o fim da pena (`until`). Aqui só se mostra:
//   - preso → a cela da delegacia (cena de baixo suspensa) e o cronômetro;
//   - a pena acabou → a cela reabre a pé e a porta devolve ao centro.

import { useCallback, useEffect, useRef, useState } from "react"
import { Lock } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getCenterInterior } from "../data"
import type { InteriorDef, LifeSummary } from "../types"

export type JailPhase = "jailed" | "released"

export function useJailStay(initial: LifeSummary | null | undefined) {
  const a = initial?.character.activity
  const [phase, setPhase] = useState<JailPhase | null>(a?.kind === "jail" ? "jailed" : null)
  const [until, setUntil] = useState<string | null>(a?.kind === "jail" ? a.until : null)
  const [interior, setInterior] = useState<InteriorDef | null>(null)
  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  /** Mensagem "life" da sala: foi preso agora, ou a pena acabou. */
  const onLife = useCallback((activity: string | undefined, end: string | null | undefined) => {
    if (activity === "jail") {
      setUntil(end ?? null)
      if (phaseRef.current !== "jailed") {
        phaseRef.current = "jailed"
        setPhase("jailed")
      }
    } else if (activity && phaseRef.current === "jailed") {
      phaseRef.current = "released"
      setPhase("released")
    }
  }, [])

  useEffect(() => {
    if (!phase || interior) return
    const token = getToken()
    if (!token) return
    let alive = true
    void getCenterInterior(token, "delegacia").then((r) => {
      if (alive && r.ok) setInterior(r.data.interior)
    })
    return () => {
      alive = false
    }
  }, [phase, interior])

  const close = useCallback(() => setPhase(null), [])
  return { phase, until, interior, onLife, close }
}

/** Quanto falta para sair (só enquanto a cela está na tela). */
export function JailTimer({ until }: { until: string | null }) {
  const t = useTranslations("MeuMundo")
  const end = until ? Date.parse(until) : NaN
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const left = Number.isFinite(end) ? Math.max(0, Math.ceil((end - now) / 1000)) : null
  const mmss = left != null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : null
  return (
    <div role="status" className="flex items-center gap-2 rounded-xl bg-black/70 px-4 py-2 text-[15px] font-semibold text-white">
      <Lock className="h-4 w-4" />
      {mmss == null || left === 0 ? t("jailReleasing", "Saindo da cela…") : t("jailLeft", "Livre em {t}").replace("{t}", mmss)}
    </div>
  )
}
