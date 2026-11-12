"use client"
// Trilha E13 — RUNAS: engastar numa cópia (engastes pela raridade; a Ascensão soma 1), tirar (a runa
// volta inteira) e fundir (3 de grau N → 1 de grau N+1). O servidor confere posse, engaste livre,
// `version` da cópia e o recibo; aqui só se mostra o estado e se pede a ação.
import { useMemo, useState } from "react"
import { fuseRunes, socketRune, unsocketRune, type GearBag, type GearCatalog, type GearInstance, type GearItem } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE, RARITY } from "../kit/aether-tokens"
import { GearItemCard, bonusLines, nameOf, type GearAction, type GearTr } from "./gear-card"
import { gradeName } from "./refinement-card"

const runeName = (id: string, byId: Map<string, GearItem>, t: GearTr) => (byId.has(id) ? nameOf(byId.get(id)!, t) : id)

/** Engastes de UMA cópia: os ocupados (com "tirar") e os livres (com a escolha da runa). */
export function RuneSocketCard({ item, inst, bag, byId, values, t, act, busy }: {
  item: GearItem; inst: GearInstance; bag: GearBag; byId: Map<string, GearItem>; values: GearCatalog["runes"]; t: GearTr; act: GearAction; busy: boolean
}) {
  const sockets = inst.sockets || []
  const max = inst.socketsMax || 0
  const owned = useMemo(() => [...byId.values()].filter(it => it.category === "rune" && (bag.owned[it.id]?.qty || 0) > 0)
    .sort((a, b) => (b.rune?.grade || 0) - (a.rune?.grade || 0)), [bag, byId])
  const [pick, setPick] = useState("")
  const chosen = owned.find(it => it.id === pick) || owned[0] || null
  const free = max - sockets.length
  const subtitle = t("upgradeState", "+{plus} · grau {grade}").replace("{plus}", String(inst.plus)).replace("{grade}", gradeName(inst.grade))
    + " · " + t("runeSockets", "{n}/{max} engastes").replace("{n}", String(sockets.length)).replace("{max}", String(max))
  return (
    <GearItemCard item={item} t={t} subtitle={subtitle} lines={bonusLines(item.bonus, t)}>
      <ul className="grid gap-1" aria-label={t("runeSocketList", "Engastes")}>
        {Array.from({ length: max }, (_, i) => {
          const id = sockets[i]
          return (
            <li key={i} className="flex min-h-11 items-center justify-between gap-2 px-2 text-[13px]" style={{ background: AE.well, boxShadow: "inset 0 0 0 1px " + AE.brassLine, color: id ? AE.text : AE.muted }}>
              <span className="min-w-0 truncate" style={id && byId.has(id) ? { color: RARITY[byId.get(id)!.rarity].color } : undefined}>{id ? runeName(id, byId, t) : t("runeEmpty", "Engaste livre")}</span>
              {id && <AetherButton tone="secondary" disabled={busy} onClick={() => void act("unsocket-" + inst.id + "-" + i, (tk, key) => unsocketRune(tk, inst.id, i, key, inst.version), t("runeRemoved", "A runa voltou para a mochila."))}>{t("runeRemove", "Tirar")}</AetherButton>}
            </li>
          )
        })}
      </ul>
      {max === 0 ? <p className="text-[12px]" style={{ color: AE.muted }}>{t("runeNoSockets", "Peça comum ou incomum não tem engaste. Raras têm 1; épicas e lendárias, 2; míticas, 3. A Ascensão soma 1.")}</p>
        : free <= 0 ? <p className="text-[12px]" style={{ color: AE.muted }}>{t("runeFull", "Todos os engastes estão ocupados.")}</p>
        : !owned.length ? <p className="text-[12px]" style={{ color: AE.muted }}>{t("runeNoneOwned", "Sem runas na mochila. Elas caem nos Domínios.")}</p>
        : <>
          <select value={chosen?.id || ""} onChange={event => setPick(event.target.value)} aria-label={t("runeChoose", "Escolher a runa")} className="min-h-11 min-w-0 px-2 text-[13px]" style={{ color: AE.text, background: AE.well, border: "1px solid " + AE.brassLine }}>
            {owned.map(it => <option key={it.id} value={it.id}>{nameOf(it, t)} ({bag.owned[it.id]?.qty || 0})</option>)}
          </select>
          {chosen && <p className="text-[12px]" style={{ color: AE.goldSoft }}>{bonusLines(runeBonus(chosen, values), t).join(" · ")}</p>}
          <AetherButton disabled={busy || !chosen} onClick={() => chosen && void act("socket-" + inst.id + "-" + chosen.id, (tk, key) => socketRune(tk, inst.id, chosen.id, key, inst.version), t("runeSocketed", "Runa engastada."))}>{t("runeSocketGo", "Engastar")}</AetherButton>
        </>}
    </GearItemCard>
  )
}

/** Bônus de uma runa (o servidor manda o valor por grau em `catalog.runes.value`). */
const runeBonus = (it: GearItem, values: GearCatalog["runes"]) => (it.rune && values ? { [it.rune.key]: values.value[it.rune.key]?.[it.rune.grade - 1] || 0 } : {})

/** Fusão: runas com pelo menos 3 na mochila. */
export function RuneFusePanel({ catalog, bag, byId, t, act, busy }: { catalog: GearCatalog; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean }) {
  const fuseIn = catalog.runes?.fuseIn ?? 3
  const grades = catalog.runes?.grades ?? 5
  const list = catalog.items.filter(it => it.category === "rune" && it.rune && it.rune.grade < grades && (bag.owned[it.id]?.qty || 0) >= fuseIn)
  if (!list.length) return <p className="py-6 text-center text-[13px]" style={{ color: AE.muted }}>{t("runeFuseNone", "Junte {n} runas iguais para fundir numa de grau acima.").replace("{n}", String(fuseIn))}</p>
  return (
    <ul className="grid gap-2">
      {list.map(it => {
        const have = bag.owned[it.id]?.qty || 0
        const next = it.id.replace(/_(\d)$/, (_, g) => "_" + (Number(g) + 1))
        const all = Math.floor(have / fuseIn)
        return (
          <li key={it.id} className="grid gap-2 p-3" style={{ background: AE.steel, boxShadow: "inset 0 0 0 1px " + AE.brassLine }}>
            <p className="text-[13px] font-bold" style={{ color: RARITY[it.rarity].color }}>{nameOf(it, t)} · {have}</p>
            <p className="text-[12px]" style={{ color: AE.text }}>{t("runeFuseRule", "{n} viram 1 {to}").replace("{n}", String(fuseIn)).replace("{to}", runeName(next, byId, t))}</p>
            <div className="flex flex-wrap gap-2">
              <AetherButton disabled={busy} onClick={() => void act("fuse-" + it.id + "-1", (tk, key) => fuseRunes(tk, it.id, 1, key), t("runeFused", "Runas fundidas."))}>{t("runeFuseOne", "Fundir 1")}</AetherButton>
              {all > 1 && <AetherButton tone="secondary" disabled={busy} onClick={() => void act("fuse-" + it.id + "-" + all, (tk, key) => fuseRunes(tk, it.id, all, key), t("runeFused", "Runas fundidas."))}>{t("runeFuseAll", "Fundir todas ({n})").replace("{n}", String(all))}</AetherButton>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
