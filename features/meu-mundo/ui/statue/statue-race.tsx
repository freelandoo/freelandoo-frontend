"use client"

// features/meu-mundo/ui/statue/statue-race.tsx — lore v2 N3: o PLACAR Raposas × Vampiros.
//
// Duas barras (uma por povo) com o néctar entregue neste domingo contra a meta
// do domingo e o estágio da estátua. Aparece na aba Semana do Ranking e na tela
// da estátua. Os números vêm do servidor (useStatueRace).

import type { StatueClan, StatueRace } from "../../data"
import { AE } from "../kit/aether-tokens"
import { archivo, teko } from "../status/evo-skin"
import { liters } from "../ranking/nectar-card"

type Tr = (key: string, fallback: string) => string

const COLOR: Record<StatueClan, string> = { raposa: AE.gold, vampiro: AE.violet }

export const STAGE_TX: [string, string][] = [
  ["sttStage0", "Dormindo"],
  ["sttStage1", "Rachando"],
  ["sttStage2", "Pedaços soltos"],
  ["sttStage3", "Olhos acesos"],
  ["sttStage4", "Cheia"],
]

export function StatueRaceBars({ race, t, locale, mine }: { race: StatueRace; t: Tr; locale: string; mine?: StatueClan | null }) {
  const rows: [StatueClan, string, string][] = [
    ["raposa", t("sttRaposas", "Raposas"), t("sttGodAurion", "Aurion")],
    ["vampiro", t("sttVampiros", "Vampiros"), t("sttGodMorkhan", "Morkhan")],
  ]
  return (
    <div className="flex flex-col gap-2" role="list" aria-label={t("sttRace", "Raposas × Vampiros")}>
      {rows.map(([clan, people, god]) => {
        const s = race.race[clan]
        const pct = s.goalMl > 0 ? Math.min(100, (s.deliveredMl / s.goalMl) * 100) : 0
        const [k, f] = STAGE_TX[Math.max(0, Math.min(4, s.stage))]
        return (
          <div key={clan} role="listitem" className="px-2.5 py-2" style={{ background: AE.steel, border: `1px solid ${mine === clan ? COLOR[clan] : AE.brassLine}` }}>
            <div className="flex items-baseline justify-between gap-2">
              <p className={`${archivo.className} min-w-0 truncate text-[12px] font-bold uppercase tracking-wide`} style={{ color: COLOR[clan] }}>
                {people}
                <span className="hidden min-[420px]:inline"> · {god}</span>
              </p>
              <span className={`${teko.className} shrink-0 text-[20px] leading-none tabular-nums`} style={{ color: AE.text }}>
                {t("sttOf", "{a} de {b}").replace("{a}", liters(s.deliveredMl, locale)).replace("{b}", liters(s.goalMl, locale))}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full" style={{ background: AE.well }} aria-hidden>
              <div className="h-full transition-[width] duration-500" style={{ width: `${pct}%`, background: COLOR[clan] }} />
            </div>
            <p className="mt-1 flex justify-between gap-2 text-[11px]" style={{ color: AE.muted }}>
              <span style={{ color: s.stage >= 4 ? COLOR[clan] : AE.muted, fontWeight: s.stage >= 4 ? 700 : 400 }}>{t(k, f)}</span>
              <span>{t("sttDonors", "{n} entregaram").replace("{n}", String(s.donors))}</span>
            </p>
          </div>
        )
      })}
    </div>
  )
}
