// features/meu-mundo/corrida/ui/circuit-select.tsx — CORRIDA (mm3d-74): SELECIONAR CIRCUITO.
//
// Pedido do Alex: logo depois de escolher a nave, os 6 circuitos em cartões —
// miniatura, nome, subtítulo, ambiente, dificuldade, loops, destaque,
// etiquetas e o melhor tempo do aparelho. Tocar seleciona; os botões de modo
// embaixo (Sozinho = CORRER, Multiplayer, Contra o relógio) largam nele;
// VOLTAR volta para a garagem. (mm3d-74b: antes o modo vinha antes da pista,
// num cardápio no meio, e o Alex não achou a escolha da pista.)
// O desenho da pista no canto sai da própria regra (sim/circuits.ts).
// 18/11: a tela virou a base de todos os minijogos (ui/kit/stage-select.tsx).

import { useMemo, useState } from "react"
import { Flag, Users } from "lucide-react"
import { TrainButton } from "../../ui/kit/train-button"
import { StageSelect, StageButton, STAGE_CYAN, type StageCardData } from "../../ui/kit/stage-select"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { MM } from "../../ui/hud/tokens"
import { menuCircuits, tagLabel } from "../engine/circuit-art"
import { shipArt } from "../engine/ship-art"
import { trackOf } from "../sim/circuits"
import type { RaceMode } from "../engine/race-game"

export interface CircuitRecord {
  race: number | null
  time: number | null
  lap: number | null
}

/** Contorno da pista (SVG, 0–100) pelas amostras da regra. */
function outline(id: string): string {
  const t = trackOf(id)
  const b = t.bounds
  const span = Math.max(b.x1 - b.x0, b.z1 - b.z0) || 1
  const ox = (span - (b.x1 - b.x0)) / 2
  const oz = (span - (b.z1 - b.z0)) / 2
  let d = ""
  for (let i = 0; i < t.n; i += 6) {
    const x = 6 + ((t.x[i] - b.x0 + ox) / span) * 88
    const y = 94 - ((t.z[i] - b.z0 + oz) / span) * 88
    d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d + "Z"
}

function fmt(s: number): string {
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${String(m).padStart(2, "0")}:${r.toFixed(3).padStart(6, "0")}`
}

export function CircuitSelect({
  current,
  records,
  multi,
  error,
  ship,
  onGarage,
  onExit,
  onPlay,
}: {
  current: string
  records: (id: string) => CircuitRecord
  /** Multiplayer disponível (no centro, perto da porta). */
  multi: boolean
  error: string | null
  ship: string
  /** Voltar para a garagem (trocar a nave). */
  onGarage: () => void
  onExit: () => void
  onPlay: (mode: RaceMode, track: string) => void
}) {
  const t = useTranslations("MeuMundo")
  const list = useMemo(() => menuCircuits(), [])
  const paths = useMemo(() => Object.fromEntries(list.map((c) => [c.id, outline(c.id)])), [list])
  const [sel, setSel] = useState(() => (list.some((c) => c.id === current) ? current : list[0].id))
  const chosen = list.find((c) => c.id === sel) ?? list[0]
  const art = shipArt(ship)
  const modes: { mode: RaceMode; icon: React.ReactNode; title: string; sub: string }[] = [
    { mode: "race", icon: <Flag className="h-5 w-5" />, title: t("corridaSelectRun", "Correr"), sub: t("corridaModeRaceSub", "Você contra 5 computadores · 3 voltas") },
    ...(multi
      ? [{ mode: "multi" as const, icon: <Users className="h-5 w-5" />, title: t("corridaModeMulti", "Multiplayer"), sub: t("corridaModeMultiSub", "Espera até 1 minuto · o resto é computador") }]
      : []),
  ]
  const diffs = [t("corridaDiff1", "Fácil"), t("corridaDiff2", "Média"), t("corridaDiff3", "Difícil")]
  const cards: StageCardData[] = list.map((c) => {
    const best = records(c.id).lap
    return {
      id: c.id,
      thumb: c.thumb,
      bg: c.bg,
      accent: c.accent,
      name: t(c.nameKey, c.name),
      sub: t(c.subKey, c.sub),
      env: t(c.envKey, c.env),
      difficulty: { level: c.difficulty, of: 3, label: diffs[c.difficulty - 1] },
      facts: [c.loops ? t("corridaLoopsN", "{n} loop(s)").replace("{n}", String(c.loops)) : t("corridaLoops0", "Sem loops")],
      highlight: t(c.highlightKey, c.highlight),
      tags: c.tags.map((tag) => tagLabel(tag, t)),
      record: { has: best !== null, text: best !== null ? t("corridaBestLapRec", "Melhor volta {t}").replace("{t}", fmt(best)) : t("corridaNoRecord", "Sem recorde ainda") },
      locked: c.active ? undefined : t("stageSoon", "Em breve"),
      badge: (
        <svg viewBox="0 0 100 100" className="absolute right-2 top-2 h-[34%] w-auto" aria-hidden>
          <path d={paths[c.id]} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={6} strokeLinejoin="round" />
          <path d={paths[c.id]} fill="none" stroke={c.accent} strokeWidth={3} strokeLinejoin="round" />
        </svg>
      ),
    }
  })
  return (
    <StageSelect
      rankGame="corrida"
      brand={
        <>
          ANTI<span style={{ color: "#FF7A2F" }}>GRAVIDADE</span>
        </>
      }
      title={t("corridaSelectTitle", "SELECIONAR CIRCUITO")}
      cards={cards}
      selected={sel}
      onSelect={setSel}
      onRun={(id) => onPlay("race", id)}
      onBack={onGarage}
      onExit={onExit}
      headerExtra={
        <button
          type="button"
          onClick={onGarage}
          className="flex shrink-0 items-center gap-2 rounded-none px-3 py-1.5 text-left max-[520px]:hidden"
          style={{ background: MM.card, border: `1px solid ${MM.border}`, color: MM.text }}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: art.holo.color, boxShadow: `0 0 8px ${art.holo.color}` }} />
          <span className="leading-tight">
            <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: MM.muted }}>
              {t("corridaMenuShip", "Sua nave")}
            </span>
            <span className="block text-[13px] font-bold">{t(art.labelKey, art.fallback)}</span>
          </span>
          <span className="ml-1 text-[12px] font-bold" style={{ color: STAGE_CYAN }}>
            {t("corridaSelectSwap", "Trocar")}
          </span>
        </button>
      }
      footerLine={t("corridaKeys", "Setas ou WASD dirigem · Espaço ou Shift = turbo")}
      error={error}
      actionCols={modes.length + 1}
      actions={
        <>
          {/* Treinar: sozinho na pista, contra o relógio (era o modo "Contra o relógio") */}
          <TrainButton onTrain={() => onPlay("time", chosen.id)} className="min-w-[150px] max-[759px]:min-w-0" />
          {modes.map((m, i) => (
            <StageButton key={m.mode} primary={i === 0} icon={m.icon} title={m.title} sub={m.sub} onClick={() => onPlay(m.mode, chosen.id)} />
          ))}
        </>
      }
    />
  )
}
