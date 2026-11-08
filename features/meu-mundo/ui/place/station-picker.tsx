"use client"

// features/meu-mundo/ui/place/station-picker.tsx — B10 (2026-11-08): escolher o APARELHO
// (academia) ou o CURSO/LIVRO (universidade, biblioteca, escola) e o NÍVEL antes de treinar
// ou estudar. A regra é do servidor (meuMundoLife.js STATIONS; vem em catalog.stations):
// aqui só se mostra o que trava e quanto rende. O servidor confere de novo.

import { Lock } from "lucide-react"
import type { LifeStationDef } from "../../types"
import { MM } from "../hud/tokens"
import { archivo } from "../status/evo-skin"

type Tr = (key: string, fallback: string) => string

export interface StationChoice {
  id: string
  tier: number
}
export const stationParam = (c: StationChoice | null) => (c ? (c.id === "bag" ? "bag" : `${c.id}:${c.tier}`) : undefined)

/** O aparelho que o ponto do prédio sugere (esteira, saco ou pesos). */
export function stationOfAnim(anim: string | null | undefined): string {
  return anim === "run" ? "treadmill" : anim === "punch" ? "bag" : "weights"
}

export function stationName(id: string, t: Tr) {
  return (
    {
      weights: t("stnWeights", "Pesos"),
      treadmill: t("stnTreadmill", "Esteira"),
      bag: t("stnBag", "Saco de pancada"),
      course: t("stnCourse", "Curso"),
      book: t("stnBook", "Livros"),
    } as Record<string, string>
  )[id] ?? id
}
function stationGives(id: string, t: Tr) {
  return (
    {
      weights: t("stnWeightsGives", "Força"),
      treadmill: t("stnTreadmillGives", "Velocidade"),
      bag: t("stnBagGives", "Velocidade e acurácia"),
      course: t("stnCourseGives", "Inteligência"),
      book: t("stnBookGives", "Inteligência"),
    } as Record<string, string>
  )[id] ?? ""
}
function attrName(a: string, t: Tr) {
  return a === "strength" ? t("atStrength", "Força") : a === "speed" ? t("atSpeed", "Velocidade") : t("atIntelligence", "Inteligência")
}

/** Maior nível que o atributo libera neste lugar. */
export function bestTier(def: LifeStationDef, place: string, attrs: Record<string, number>): number {
  const max = Math.min(def.maxTier, def.placeMax?.[place] ?? def.maxTier)
  const v = def.attr ? Number(attrs[def.attr]) || 0 : Infinity
  let best = 1
  for (let i = 1; i <= max; i++) if (v >= def.min[i - 1]) best = i
  return best
}

export function StationPicker({
  stations,
  ids,
  place,
  attrs,
  value,
  onChange,
  t,
}: {
  stations: Record<string, LifeStationDef>
  /** Os aparelhos que valem aqui (na ordem dos botões). */
  ids: string[]
  place: string
  attrs: Record<string, number>
  value: StationChoice
  onChange: (c: StationChoice) => void
  t: Tr
}) {
  const def = stations[value.id]
  const max = def ? Math.min(def.maxTier, def.placeMax?.[place] ?? def.maxTier) : 1
  const v = def?.attr ? Number(attrs[def.attr]) || 0 : 0
  // o primeiro nível ainda travado (0 = todos liberados)
  const nextLocked = def?.attr ? Array.from({ length: max }, (_, i) => i + 1).find((n) => v < def.min[n - 1]) ?? 0 : 0
  const chip = (on: boolean, locked = false) => ({
    borderRadius: 999,
    background: on ? MM.gold : MM.surface,
    color: on ? "#1a1206" : locked ? MM.muted : MM.text,
    border: `1px solid ${on ? MM.gold : MM.border}`,
    opacity: locked ? 0.6 : 1,
  })
  return (
    <div className={`${archivo.className} mt-3 grid gap-2`}>
      {ids.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("stnPick", "Aparelho")}>
          {ids.map((id) => {
            const d = stations[id]
            if (!d) return null
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={value.id === id}
                onClick={() => onChange({ id, tier: bestTier(d, place, attrs) })}
                className="min-h-9 px-3 text-[13px] font-semibold"
                style={chip(value.id === id)}
              >
                {stationName(id, t)}
              </button>
            )
          })}
        </div>
      )}
      <p className="text-[13px]" style={{ color: MM.muted }}>
        {stationName(value.id, t)} · {stationGives(value.id, t)}
      </p>
      {def && max > 1 && (
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("stnTier", "Nível")}>
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => {
            const need = def.min[n - 1]
            const locked = !!def.attr && v < need
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={value.tier === n}
                disabled={locked}
                onClick={() => onChange({ id: value.id, tier: n })}
                className="flex min-h-9 items-center gap-1 px-3 text-[13px] font-semibold"
                style={chip(value.tier === n, locked)}
                title={locked && def.attr ? t("stnNeed", "Precisa de {n} de {attr}").replace("{n}", String(need)).replace("{attr}", attrName(def.attr, t)) : undefined}
              >
                {locked && <Lock className="h-3.5 w-3.5" />}
                {t("stnTierN", "Nv. {n}").replace("{n}", String(n))}
                <span style={{ opacity: 0.75 }}>×{def.mul[n - 1].toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </button>
            )
          })}
        </div>
      )}
      {def?.attr && nextLocked > 0 && (
        <p className="text-[12px]" style={{ color: MM.muted }}>
          {t("stnNext", "Próximo nível com {n} de {attr} (você tem {v}).")
            .replace("{n}", String(def.min[nextLocked - 1]))
            .replace("{attr}", attrName(def.attr, t))
            .replace("{v}", String(Math.floor(v)))}
        </p>
      )}
    </div>
  )
}
