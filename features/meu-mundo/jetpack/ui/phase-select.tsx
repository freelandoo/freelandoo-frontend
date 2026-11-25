"use client"

// features/meu-mundo/jetpack/ui/phase-select.tsx — JETPACK (mm3d-75): SELECIONAR FASE.
//
// Os cartões das fases (miniatura, número, nome, ambiente, dificuldade, característica,
// etiquetas, metas das 3 estrelas e o recorde do aparelho); embaixo Treinar e CORRER.
// Anéis do Vácuo aparece trancada ("Em breve"). 18/11 (pedido do Alex): mesmo layout da
// Antigravidade — a tela é a peça comum ui/kit/stage-select.tsx.

import { useMemo, useState } from "react"
import { Play, Star } from "lucide-react"
import { TrainButton } from "../../ui/kit/train-button"
import { StageSelect, StageButton, type StageCardData } from "../../ui/kit/stage-select"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { menuPhases, starsFor } from "../engine/phase-art"
import type { PhaseId } from "../sim/phases"

export interface PhaseRecord {
  dist: number
  score: number
  /** Estrelas de desempenho já ganhas (0–3). */
  stars: number
  /** Voos nessa fase (neste aparelho). */
  runs: number
}

const YELLOW = "#FFC21A"

function Stars({ n, of }: { n: number; of: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${n}/${of}`}>
      {Array.from({ length: of }, (_, i) => (
        <Star key={i} style={{ width: 13, height: 13, color: i < n ? YELLOW : "rgba(255,255,255,0.35)" }} fill={i < n ? YELLOW : "transparent"} strokeWidth={1.6} />
      ))}
    </span>
  )
}

export function PhaseSelect({
  current,
  records,
  multi,
  error,
  onExit,
  onPlay,
  onTrain,
}: {
  current: PhaseId
  records: (id: PhaseId) => PhaseRecord | null
  /** Multiplayer disponível (no centro, perto da porta). */
  multi: boolean
  error: string | null
  onExit: () => void
  onPlay: (solo: boolean, phase: PhaseId) => void
  /** Treinar: voo sozinho no aparelho, sem espera (botão rosa). */
  onTrain?: (phase: PhaseId) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuPhases(), [])
  const [sel, setSel] = useState<PhaseId>(() => (list.some((p) => p.enabled && p.art.id === current) ? current : "industrial"))
  const diffLabel = (d: number) => [t("jetDiff1", "Muito fácil"), t("jetDiff2", "Fácil"), t("jetDiff3", "Média"), t("jetDiff4", "Difícil"), t("jetDiff5", "Extrema")][d - 1]
  const cards: StageCardData[] = list.map(({ art: a, enabled }) => {
    const r = enabled ? records(a.id) : null
    return {
      id: a.id,
      thumb: a.thumb,
      bg: a.bg,
      accent: a.accent,
      num: a.num,
      name: t(a.nameKey, a.name),
      sub: t(a.subKey, a.sub),
      env: t(a.envKey, a.env),
      difficulty: { level: a.difficulty, of: 5, label: diffLabel(a.difficulty) },
      facts: [t("jetGoals", "Metas {a} / {b} / {c} m").replace("{a}", a.stars[0].toLocaleString()).replace("{b}", a.stars[1].toLocaleString()).replace("{c}", a.stars[2].toLocaleString())],
      highlight: t(a.featureKey, a.feature),
      tags: a.tags.map((g) => t(g.key, g.label)),
      record: {
        has: !!r,
        text: r ? t("jetPhaseBest", "Recorde: {d} m · {s} pontos").replace("{d}", r.dist.toLocaleString()).replace("{s}", r.score.toLocaleString()) : t("jetPhaseNoRecord", "Sem recorde nesta fase ainda"),
      },
      locked: enabled ? undefined : t("jetSoon", "Em breve"),
      badge:
        r && r.stars > 0 ? (
          <span className="absolute right-2 top-2 px-1.5 py-1" style={{ background: "rgba(0,0,0,0.55)" }}>
            <Stars n={r.stars} of={3} />
          </span>
        ) : undefined,
    }
  })
  // 2026-11-08 (regra do Alex): sempre a largada em grupo de 4 (computadores completam)
  const go = (id: PhaseId) => onPlay(false, id)
  const showTrain = !!onTrain && multi
  return (
    <StageSelect
      rankGame="jetpack"
      brand="JETPACK"
      title={t("jetSelectTitle", "Selecionar fase")}
      cards={cards}
      selected={sel}
      onSelect={(id) => setSel(id as PhaseId)}
      onRun={(id) => go(id as PhaseId)}
      onExit={onExit}
      footerLine={multi ? t("jetModeFour", "Sempre 4 no túnel · espera até 1 minuto · vaga vazia vira computador") : t("jetModeOffline", "Sem conexão: voo de treino no aparelho")}
      error={error}
      actionCols={showTrain ? 2 : 1}
      actions={
        <>
          {showTrain && <TrainButton onTrain={() => onTrain(sel)} className="min-w-[150px] max-[759px]:min-w-0" />}
          <StageButton primary icon={<Play className="h-5 w-5" />} title={t("jetRun", "Correr")} sub={t("jetKeys", "← → ou A D para os lados · Espaço, ↑, W ou o botão do mouse seguram o propulsor")} onClick={() => go(sel)} />
        </>
      }
    />
  )
}

/** Estrelas de uma distância (para a tela de fim). */
export { starsFor }
