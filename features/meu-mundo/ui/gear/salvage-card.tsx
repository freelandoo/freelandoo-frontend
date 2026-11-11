"use client"
// Trilha E11 — DESMONTAR uma cópia (parte dos materiais da receita + Pó de Refino, nunca Esmeralda)
// e TRANSMUTAR material (3 → 1 do mesmo tier). Travar protege a cópia. O servidor confere posse,
// trava, quem veste e o recibo; aqui só se mostra a prévia que ele mandou e se pede confirmação.
import { useMemo, useState } from "react"
import { lockGear, salvageGear, transmuteGear, type GearBag, type GearCatalog, type GearInstance, type GearItem } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE, RARITY } from "../kit/aether-tokens"
import { GearItemCard, nameOf, type GearAction, type GearTr } from "./gear-card"
import { gradeName } from "./refinement-card"

export function SalvageCard({ item, inst, bag, byId, t, act, busy, confirmTier }: {
  item: GearItem; inst: GearInstance; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean; confirmTier: number
}) {
  const [confirm, setConfirm] = useState(false)
  const back = bag.forge?.[inst.id]?.salvage ?? null
  const worn = !!inst.equippedBy
  const precious = (item.tier || 1) >= confirmTier
  const subtitle = t("upgradeState", "+{plus} · grau {grade}").replace("{plus}", String(inst.plus)).replace("{grade}", gradeName(inst.grade))
  return (
    <GearItemCard item={item} t={t} subtitle={subtitle}>
      <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("salvageGives", "Desmontar devolve")}</p>
      {back && <ul className="grid gap-1 text-[12px]" style={{ color: AE.text }}>
        {Object.entries(back).map(([id, n]) => <li key={id} className="flex justify-between gap-2"><span>{byId.has(id) ? nameOf(byId.get(id)!, t) : id}</span><span className="tabular-nums" style={{ color: AE.good }}>+{n}</span></li>)}
      </ul>}
      <p className="text-[12px]" style={{ color: AE.muted }}>{t("salvageNoEmerald", "Nunca devolve Esmeralda. A cópia some da mochila.")}</p>
      {worn && <p className="text-[12px]" style={{ color: AE.bad }}>{t("salvageWorn", "Alguém veste esta cópia: tire antes de desmontar.")}</p>}
      <AetherButton tone="secondary" disabled={busy} onClick={() => void act("lock-" + inst.id, (tk) => lockGear(tk, inst.id, !inst.locked), inst.locked ? t("salvageUnlocked", "Cópia destravada.") : t("salvageLocked", "Cópia travada."))}>
        {inst.locked ? t("salvageUnlock", "Destravar") : t("salvageLock", "Travar (não desmonta nem recicla)")}
      </AetherButton>
      {confirm ? <>
        <p className="text-[12px] font-semibold" style={{ color: precious ? AE.bad : AE.goldSoft }}>
          {precious ? t("salvageConfirmRare", "Peça {rarity}: desmontar não tem volta. Confirmar?").replace("{rarity}", t(RARITY[item.rarity].labelKey, RARITY[item.rarity].label)) : t("salvageConfirm", "Desmontar esta cópia?")}
        </p>
        <AetherButton busy={busy} onClick={() => { setConfirm(false); void act("salvage-" + inst.id, (tk, key) => salvageGear(tk, item.id, inst.id, key, true), t("salvageDone", "Desmontada.")) }}>{t("gearConfirm", "Confirmar")}</AetherButton>
        <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("gearCancel", "Voltar")}</AetherButton>
      </> : <AetherButton disabled={busy || worn || inst.locked} onClick={() => setConfirm(true)}>{t("salvageGo", "Desmontar")}</AetherButton>}
    </GearItemCard>
  )
}

export function TransmutePanel({ catalog, bag, t, act, busy }: { catalog: GearCatalog; bag: GearBag; t: GearTr; act: GearAction; busy: boolean }) {
  const ratio = catalog.salvage?.transmuteIn ?? 3
  const perTier = catalog.salvage?.transmuteCoins ?? 20
  const pool = useMemo(() => catalog.items.filter(item => item.transmutable), [catalog])
  const sources = pool.filter(item => (bag.owned[item.id]?.qty || 0) >= ratio)
  const [fromId, setFromId] = useState<string>("")
  const from = sources.find(item => item.id === fromId) || sources[0] || null
  const targets = from ? pool.filter(item => item.id !== from.id && item.tier === from.tier && item.category === from.category) : []
  const [toId, setToId] = useState<string>("")
  const to = targets.find(item => item.id === toId) || targets[0] || null
  const max = from ? Math.floor((bag.owned[from.id]?.qty || 0) / ratio) : 0
  const [qty, setQty] = useState(1)
  const n = Math.max(1, Math.min(max || 1, qty))
  const coins = from ? perTier * (from.tier || 1) * n : 0
  const can = !!from && !!to && max >= 1 && bag.coins >= coins
  const field = { color: AE.text, background: AE.well, border: "1px solid " + AE.brassLine }
  if (!sources.length) return <p className="py-6 text-center text-[13px]" style={{ color: AE.muted }}>{t("transmuteNone", "Junte pelo menos {n} de um material para transmutar.").replace("{n}", String(ratio))}</p>
  return (
    <div className="grid gap-3 p-3" style={{ background: AE.steel, boxShadow: "inset 0 0 0 1px " + AE.brassLine }}>
      <p className="text-[13px]" style={{ color: AE.muted }}>{t("transmuteRule", "{n} de um material viram 1 de outro do mesmo tier, mais Esmeraldas.").replace("{n}", String(ratio))}</p>
      <label className="grid gap-1 text-[12px]" style={{ color: AE.text }}>
        {t("transmuteFrom", "Gastar")}
        <select value={from?.id || ""} onChange={event => { setFromId(event.target.value); setToId(""); setQty(1) }} className="min-h-11 min-w-0 px-2 text-[13px]" style={field}>
          {sources.map(item => <option key={item.id} value={item.id}>{nameOf(item, t)} ({bag.owned[item.id]?.qty || 0})</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-[12px]" style={{ color: AE.text }}>
        {t("transmuteTo", "Receber")}
        <select value={to?.id || ""} onChange={event => setToId(event.target.value)} className="min-h-11 min-w-0 px-2 text-[13px]" style={field}>
          {targets.map(item => <option key={item.id} value={item.id}>{nameOf(item, t)}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-[12px]" style={{ color: AE.text }}>
        {t("transmuteTimes", "Quantas (máx. {n})").replace("{n}", String(max))}
        <input type="number" inputMode="numeric" min={1} max={max} value={n} onChange={event => setQty(Math.floor(Number(event.target.value) || 1))} className="min-h-11 min-w-0 px-2 text-[13px]" style={field} />
      </label>
      {from && to && <p className="text-[13px] font-semibold" style={{ color: AE.goldSoft }}>
        {t("transmuteSummary", "{a} {from} → {b} {to} · {c} Esmeraldas").replace("{a}", String(n * ratio)).replace("{from}", nameOf(from, t)).replace("{b}", String(n)).replace("{to}", nameOf(to, t)).replace("{c}", String(coins))}
      </p>}
      <AetherButton disabled={!can || busy} onClick={() => from && to && void act("transmute-" + from.id + "-" + to.id + "-" + n, (tk, key) => transmuteGear(tk, from.id, to.id, n, key), t("transmuteDone", "Transmutado."))}>{can ? t("transmuteGo", "Transmutar") : t("refineMissing", "Faltam moedas ou materiais")}</AetherButton>
    </div>
  )
}
