"use client"
// Trilha E8 — Índice de fragmentos: onde achar cada um (região, chefão), quanto falta e o que fazer
// com o que sobra. Busca por arma, região, chefão e raridade. O servidor diz tudo (catálogo + mochila);
// aqui só se filtra e desenha.
import { useMemo, useState } from "react"
import { convertFragments, type GearBag, type GearItem, type GearRarity } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE, RARITY } from "../kit/aether-tokens"
import { nameOf, type GearAction, type GearTr } from "./gear-card"

const REGIONS = ["floresta", "canion", "gelo", "fabrica", "vulcao", "orbital", "hall", "rua", "paint"] as const

export function regionName(region: string, t: GearTr) {
  if (region === "hall") return t("fragRegionHall", "Hall dos Campeões")
  if (region === "rua") return t("fragRegionStreet", "Rua de noite")
  if (region === "paint") return t("fragRegionPaint", "Paint")
  return t("domName_" + region, region)
}
function bossName(boss: string | null, t: GearTr) {
  if (!boss) return null
  if (boss === "elite") return t("fragBossElite", "Monstro de elite")
  return t("skinGod_" + boss, boss)
}
const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

export function FragmentIndex({ items, byId, bag, t, busy, act }: {
  items: GearItem[]; byId: Map<string, GearItem>; bag: GearBag; t: GearTr; busy: boolean; act: GearAction
}) {
  const [query, setQuery] = useState("")
  const [region, setRegion] = useState<string>("all")
  const [rarity, setRarity] = useState<GearRarity | "all">("all")
  const [bossOnly, setBossOnly] = useState(false)
  const fragments = useMemo(() => items.filter(item => item.category === "fragment" && item.fragment), [items])
  const rows = fragments.filter(item => {
    if (region !== "all" && item.origin?.region !== region) return false
    if (rarity !== "all" && item.rarity !== rarity) return false
    if (bossOnly && item.origin?.kind !== "boss") return false
    if (!query.trim()) return true
    const target = byId.get(item.fragment!.of)
    const hay = [nameOf(item, t), target ? nameOf(target, t) : "", item.origin ? regionName(item.origin.region, t) : "", bossName(item.origin?.boss ?? null, t) ?? "",
      item.fragment!.set ? t("gearSet_" + item.fragment!.set, item.fragment!.set) : ""].join(" ")
    return plain(hay).includes(plain(query))
  })
  const select = { color: AE.text, background: AE.well, border: "1px solid " + AE.brassLine }
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t("fragSearch", "Buscar arma, região ou chefão")} aria-label={t("fragSearch", "Buscar arma, região ou chefão")}
          className="min-h-11 min-w-0 px-2 text-[13px] sm:col-span-2" style={select} />
        <select value={region} onChange={event => setRegion(event.target.value)} aria-label={t("fragRegion", "Região")} className="min-h-11 min-w-0 px-2 text-[13px]" style={select}>
          <option value="all">{t("fragAllRegions", "Todas as regiões")}</option>
          {REGIONS.filter(r => fragments.some(f => f.origin?.region === r)).map(r => <option key={r} value={r}>{regionName(r, t)}</option>)}
        </select>
        <select value={rarity} onChange={event => setRarity(event.target.value as GearRarity | "all")} aria-label={t("fragRarity", "Raridade")} className="min-h-11 min-w-0 px-2 text-[13px]" style={select}>
          <option value="all">{t("fragAllRarities", "Todas as raridades")}</option>
          {(Object.keys(RARITY) as GearRarity[]).filter(r => fragments.some(f => f.rarity === r)).map(r => <option key={r} value={r}>{t(RARITY[r].labelKey, RARITY[r].label)}</option>)}
        </select>
        <label className="flex min-h-11 items-center gap-2 text-[13px] sm:col-span-2" style={{ color: AE.text }}>
          <input type="checkbox" checked={bossOnly} onChange={event => setBossOnly(event.target.checked)} className="h-5 w-5" />
          {t("fragBossOnly", "Só os que caem de chefão")}
        </label>
      </div>
      {!rows.length && <p className="py-6 text-center text-[13px]" style={{ color: AE.muted }}>{t("gearNothing", "Nada por aqui ainda.")}</p>}
      <ul className="grid gap-2">
        {rows.map(item => {
          const frag = item.fragment!
          const have = bag.owned[item.id]?.qty || 0
          const target = byId.get(frag.of)
          const done = !frag.set && !!bag.owned[frag.of]
          // sobra: tudo, se a arma já é sua; senão, o que passa do necessário
          const spare = done ? have : Math.max(0, have - frag.need)
          const pct = Math.min(1, have / frag.need)
          const color = RARITY[item.rarity].color
          const boss = bossName(item.origin?.boss ?? null, t)
          return (
            <li key={item.id} className="grid gap-2 p-3" style={{ background: AE.steel, boxShadow: "inset 0 0 0 1px " + AE.brassLine }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold leading-tight" style={{ color: AE.text }}>{nameOf(item, t)}</p>
                  <p className="text-[12px]" style={{ color: AE.muted }}>
                    {frag.set ? t("fragForSet", "Peças do conjunto {name}").replace("{name}", t("gearSet_" + frag.set, frag.set)) : target ? t("fragForItem", "Para: {name}").replace("{name}", nameOf(target, t)) : null}
                  </p>
                </div>
                <span className="shrink-0 px-1.5 py-1 text-[10px] font-bold uppercase" style={{ color, boxShadow: "inset 0 0 0 1px " + color }}>{t(RARITY[item.rarity].labelKey, RARITY[item.rarity].label)}</span>
              </div>
              {item.origin && <p className="text-[12px]" style={{ color: AE.goldSoft }}>
                {regionName(item.origin.region, t)}{boss ? " · " + t("fragBossLine", "chefão: {name}").replace("{name}", boss) : item.origin.kind === "sector" ? " · " + t("fragSectors", "setores 7 a 10") : ""}
              </p>}
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1" style={{ background: AE.well }} role="progressbar" aria-valuemin={0} aria-valuemax={frag.need} aria-valuenow={Math.min(have, frag.need)}>
                  <div className="h-full" style={{ width: pct * 100 + "%", background: pct >= 1 ? AE.good : color }} />
                </div>
                <span className="shrink-0 text-[12px] tabular-nums" style={{ color: pct >= 1 ? AE.good : AE.muted }}>{have}/{frag.need}</span>
              </div>
              {spare > 0 && <AetherButton tone="secondary" disabled={busy} onClick={() => void act("convert-" + item.id, (tk, key) => convertFragments(tk, item.id, spare, key), t("fragConverted", "Sobra convertida em Pó de Refino."))}>
                {t("fragConvert", "Converter {n} em {p} de Pó de Refino").replace("{n}", String(spare)).replace("{p}", String(spare * frag.powder))}
              </AetherButton>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
