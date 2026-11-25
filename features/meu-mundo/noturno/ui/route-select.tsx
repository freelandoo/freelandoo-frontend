"use client"

// features/meu-mundo/noturno/ui/route-select.tsx — ROLÊ NOTURNO 2.0: ESCOLHA SUA ROTA.
//
// Os cartões das seis rotas (as cinco novas e a Clássica de antes) com miniatura, ambiente,
// dificuldade, o momento de destaque, etiquetas e o recorde do aparelho NESSA rota com o
// veículo escolhido; embaixo o veículo, Treinar e JOGAR. Teclado: ← → trocam a rota, Enter joga.
// 18/11 (pedido do Alex): mesmo layout da Antigravidade (ui/kit/stage-select.tsx).

import { useEffect, useMemo, useState } from "react"
import { Bike, Play } from "lucide-react"
import { TrainButton } from "../../ui/kit/train-button"
import { StageSelect, StageButton, type StageCardData } from "../../ui/kit/stage-select"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { RIDES, type RideKind } from "../sim/run"
import type { RunPhase } from "../sim/track"
import { menuRoutes } from "../engine/route-art"

export interface RouteRecord {
  score: number
  dist: number
  coins: number
}

const RIDE_ORDER: RideKind[] = ["bike", "skate", "skates"]
/** Dificuldade de cada rota (1–3), para as barras do cartão. */
const ROUTE_DIFF: Record<RunPhase, number> = { classica: 1, floresta: 2, canion: 2, orbital: 3, fabrica: 3, forja: 3 }

function SkateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 11.5c1 1.5 2 2 3.5 2h13c1.5 0 2.5-.5 3.5-2" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17" cy="17.5" r="1.8" />
    </svg>
  )
}
function SkatesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h5v7l6 2.5c1.5.6 2 1.5 2 3V17H5V4.5" />
      <circle cx="7.5" cy="20" r="1.6" />
      <circle cx="12" cy="20" r="1.6" />
      <circle cx="16.5" cy="20" r="1.6" />
    </svg>
  )
}
export function RideGlyph({ ride, className }: { ride: RideKind; className?: string }) {
  if (ride === "bike") return <Bike className={className} aria-hidden />
  if (ride === "skate") return <SkateIcon className={className} />
  return <SkatesIcon className={className} />
}

export function RouteSelect({
  phase,
  ride,
  records,
  multi,
  error,
  onExit,
  onTrain,
  onPlay,
}: {
  phase: RunPhase
  ride: RideKind
  records: (phase: RunPhase, ride: RideKind) => RouteRecord | null
  multi: boolean
  error: string | null
  onExit: () => void
  onPlay: (ride: RideKind, phase: RunPhase) => void
  /** Treinar: rolê sozinho no aparelho, sem espera (botão rosa). */
  onTrain?: (ride: RideKind, phase: RunPhase) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuRoutes(), [])
  const [sel, setSel] = useState<RunPhase>(phase)
  const [veh, setVeh] = useState<RideKind>(ride)
  const names: Record<RideKind, string> = {
    bike: t("noturnoRideBike", "Bicicleta"),
    skate: t("noturnoRideSkate", "Skate"),
    skates: t("noturnoRideSkates", "Patins"),
  }
  const blurb: Record<RideKind, string> = {
    bike: t("noturnoBikeSub", "A mais rápida. Pulo mais baixo."),
    skate: t("noturnoSkateSub", "O pulo mais alto. Manobra nas rampas."),
    skates: t("noturnoSkatesSub", "A mais ágil para trocar de faixa."),
  }
  const diffs = [t("corridaDiff1", "Fácil"), t("corridaDiff2", "Média"), t("corridaDiff3", "Difícil")]
  // teclado: ← → trocam a rota (Enter joga: na peça comum)
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
      const i = list.findIndex((r) => r.id === sel)
      const n = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length]
      setSel(n.id)
      e.preventDefault()
    }
    window.addEventListener("keydown", k)
    return () => window.removeEventListener("keydown", k)
  }, [list, sel])
  const cards: StageCardData[] = list.map((a) => {
    const r = records(a.id, veh)
    const d = ROUTE_DIFF[a.id] ?? 2
    return {
      id: a.id,
      thumb: a.thumb,
      bg: a.bg,
      accent: a.accent,
      num: a.num,
      name: t(a.nameKey, a.name),
      env: t(a.envKey, a.env),
      difficulty: { level: d, of: 3, label: diffs[d - 1] },
      highlight: t(a.heroKey, a.hero),
      tags: a.tags.map((g) => t(g.key, g.label)),
      record: {
        has: !!r,
        text: r
          ? t("rnRouteBest", "Recorde de {ride}: {s} pontos · {d} m").replace("{ride}", names[veh].toLowerCase()).replace("{s}", r.score.toLocaleString()).replace("{d}", r.dist.toLocaleString())
          : t("rnRouteNoRecord", "Sem recorde nesta rota ainda"),
      },
    }
  })
  const showTrain = !!onTrain && multi
  return (
    <StageSelect
      rankGame="noturno"
      brand={
        <>
          ROLÊ <span style={{ color: "#FF4FB3" }}>NOTURNO</span>
        </>
      }
      title={t("rnChooseRoute", "Escolha sua rota")}
      cards={cards}
      selected={sel}
      onSelect={(id) => setSel(id as RunPhase)}
      onRun={(id) => onPlay(veh, id as RunPhase)}
      onExit={onExit}
      footerLine={`${blurb[veh]} · ${t("noturnoStatSpeed", "Velocidade")} ${Math.round(RIDES[veh].at[RIDES[veh].at.length - 1] * 3.6)} km/h`}
      error={error}
      footerExtra={
        <div className="grid shrink-0 grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("noturnoChoose", "Escolha o seu veículo")}>
          {RIDE_ORDER.map((r) => {
            const on = r === veh
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={on}
                title={blurb[r]}
                onClick={() => setVeh(r)}
                className="flex min-h-[52px] items-center justify-center gap-1.5 px-3 text-[13px] font-bold transition-transform active:scale-[0.97] motion-reduce:transition-none"
                style={{ background: on ? "rgba(255,79,179,0.18)" : MM.card, border: `1.5px solid ${on ? "#FF4FB3" : MM.border}`, color: MM.text }}
              >
                <RideGlyph ride={r} className="h-5 w-5 shrink-0" />
                <span className="max-[380px]:hidden">{names[r]}</span>
              </button>
            )
          })}
        </div>
      }
      actionCols={showTrain ? 2 : 1}
      actions={
        <>
          {showTrain && <TrainButton onTrain={() => onTrain(veh, sel)} className="min-w-[150px] max-[759px]:min-w-0" />}
          <StageButton primary icon={<Play className="h-5 w-5" />} title={t("rnPlay", "JOGAR")} sub={multi ? t("noturnoModeBotsSub4", "Espera até 20 segundos · até 4") : undefined} onClick={() => onPlay(veh, sel)} />
        </>
      }
    />
  )
}
