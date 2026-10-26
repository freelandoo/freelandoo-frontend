"use client"

// features/meu-mundo/ui/place/place-screen.tsx — um prédio do centro por
// dentro COM as ações (mm3d-37). A cena e o andar são do PlaceView; aqui
// mora o que cada ponto faz, sempre pedido à vida no servidor:
//  - treinar (academia) e estudar (universidade, biblioteca, escola): escolhe
//    as horas, a vida confere que a pessoa está no prédio e marca; sair do
//    aparelho ou do prédio para (fechar o jogo, não — a vida segue sozinha).

import { useCallback, useEffect, useRef, useState } from "react"
import { BookOpen, Dumbbell } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { postLifeActivity } from "../../data"
import { POSE_OF_ANIM, type PlacePose } from "../../engine/avatars"
import type { PlaceState } from "../../engine/place-game"
import type { BodyId, InteriorDef, PlaceUse } from "../../types"
import { EvoButton, EvoDialog, EvoToast } from "../hud/hud-kit"
import { PlaceView } from "../place-view"

/** Hora de aula (moedas do jogo) — espelho de PLACE_RULES em meuMundoLife.js. */
const CLASS_FEE_H: Record<string, number> = { universidade: 8 }
/** Rendimento do estudo no lugar — espelho de PLACE_RULES em meuMundoLife.js. */
const STUDY_MUL: Record<string, number> = { universidade: 1.5 }
const HOURS = [1, 2, 4, 8] as const

type Tr = (key: string, fallback: string) => string

export interface PlaceScreenProps {
  placeId: string
  placeName: string
  interior: InteriorDef
  body: BodyId
  look?: string
  onExit: () => void
}

/** O que está em andamento aqui dentro (null = nada). */
interface Doing {
  kind: "training" | "studying"
  hours: number
}

export function PlaceScreen({ placeId, placeName, interior, body, look = "", onExit }: PlaceScreenProps) {
  const t = useTranslations("MeuMundo") as Tr
  const [ask, setAsk] = useState<{ use: PlaceUse; state: PlaceState } | null>(null)
  const [doing, setDoing] = useState<Doing | null>(null)
  const [pose, setPose] = useState<PlacePose | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ text: string; tone: "ouro" | "magenta" } | null>(null)
  const doingRef = useRef<Doing | null>(null)

  useEffect(() => {
    doingRef.current = doing
  }, [doing])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(id)
  }, [toast])

  /** Para a atividade (saiu do aparelho ou do prédio). */
  const stop = useCallback(() => {
    if (!doingRef.current) return
    doingRef.current = null
    setDoing(null)
    setPose(null)
    const token = getToken()
    if (token) void postLifeActivity(token, "idle")
  }, [])

  const start = async (hours: number) => {
    if (!ask) return
    const kind = ask.use === "train" ? "training" : "studying"
    const token = getToken()
    if (!token) return
    setBusy(true)
    const r = await postLifeActivity(token, kind, hours, placeId)
    setBusy(false)
    setAsk(null)
    if (!r.ok) {
      setToast({ text: r.error || t("pvFail", "Não deu certo agora. Tente de novo."), tone: "magenta" })
      return
    }
    const d = { kind, hours } as Doing
    doingRef.current = d
    setDoing(d)
    // Treino: o movimento do aparelho; estudo: sentado (a pose da cadeira).
    const anim = ask.state.kind === "spot" ? ask.state.spot.anim : null
    setPose(kind === "training" && anim ? (POSE_OF_ANIM[anim] ?? null) : null)
    setToast({
      text: (kind === "training" ? t("pvTrainingFor", "Treinando por {h} h") : t("pvStudyingFor", "Estudando por {h} h")).replace("{h}", String(hours)),
      tone: "ouro",
    })
  }

  const onUse = (use: PlaceUse, state: PlaceState) => {
    if (use === "train" || use === "study") {
      if (doingRef.current) return
      setAsk({ use, state })
      return
    }
    setToast({ text: t("pvSoon", "Em breve"), tone: "ouro" })
  }

  const onState = (s: PlaceState) => {
    // Levantou / saiu do aparelho: a atividade para.
    if (s.kind === "free") stop()
  }

  const leave = () => {
    stop()
    onExit()
  }

  const fee = CLASS_FEE_H[placeId] ?? 0
  const training = ask?.use === "train"

  return (
    <>
      <PlaceView
        interior={interior}
        body={body}
        look={look}
        mode="visit"
        placeName={placeName}
        onExit={leave}
        onUse={onUse}
        onState={onState}
        pose={pose}
        blocked={!!ask}
        hideUse={!!doing}
        extra={
          doing ? (
            <EvoToast icon={doing.kind === "training" ? <Dumbbell className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}>
              {(doing.kind === "training" ? t("pvTrainingFor", "Treinando por {h} h") : t("pvStudyingFor", "Estudando por {h} h")).replace("{h}", String(doing.hours))}
            </EvoToast>
          ) : null
        }
      />
      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-6 z-[75] -translate-x-1/2">
          <EvoToast tone={toast.tone}>{toast.text}</EvoToast>
        </div>
      )}
      {ask && (
        <div className="fixed inset-0 z-[76]">
          <EvoDialog
            labelId="mm-place-hours"
            eyebrow={placeName}
            title={training ? t("pvTrainTitle", "Treinar quanto tempo?") : t("pvStudyTitle", "Estudar quanto tempo?")}
            onClose={() => setAsk(null)}
            footer={HOURS.map((h) => (
              <EvoButton key={h} variant="gold" loading={busy} onClick={() => void start(h)}>
                {`${h} h${fee ? ` · ${fee * h}` : ""}`}
              </EvoButton>
            ))}
          >
            <p>
              {training
                ? t("pvTrainText", "Força e velocidade sobem nas primeiras 4 h do dia. Ele continua mesmo com o jogo fechado; sair do aparelho para.")
                : t("pvStudyText", "A inteligência sobe nas primeiras 5 h do dia. Ele continua mesmo com o jogo fechado; levantar para.")}
            </p>
            {!training && (STUDY_MUL[placeId] ?? 1) > 1 && (
              <p className="mt-2">
                {t("pvUniText", "Na universidade rende 1,5× — a hora de aula custa {c} moedas.").replace("{c}", String(fee))}
              </p>
            )}
          </EvoDialog>
        </div>
      )}
    </>
  )
}
