"use client"
// Bancada da Forja, por CÓPIA (trilha E2). Trilha E9: aprimoramento garantido (forge-v2) — custo fixo
// do próximo passo, bônus antes e depois e um botão; sempre sobe. O servidor diz o custo e confere tudo.
import { useState } from "react"
import { upgradeGear, type GearBag, type GearInstance, type GearItem, type UpgradeView } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { GearItemCard, bonusLines, nameOf, type GearAction, type GearTr } from "./gear-card"

const ROMAN = ["I", "II", "III", "IV", "V"]
export const gradeName = (grade: number) => ROMAN[Math.max(0, Math.min(4, grade - 1))]

function Costs({ coins, needs, bag, byId, t }: { coins: number; needs: Record<string, number>; bag: GearBag; byId: Map<string, GearItem>; t: GearTr }) {
  return (
    <ul className="grid gap-1 text-[12px]" aria-label={t("forgeRequired", "Materiais necessários")}>
      <li className="flex justify-between gap-2" style={{ color: bag.coins >= coins ? AE.good : AE.bad }}>
        <span>{t("upgradeEmeralds", "Esmeraldas")}</span><span className="tabular-nums">{Math.floor(bag.coins)}/{coins}</span>
      </li>
      {Object.entries(needs).map(([id, qty]) => {
        const have = bag.owned[id]?.qty || 0
        return <li key={id} className="flex justify-between gap-2" style={{ color: have >= qty ? AE.good : AE.bad }}><span>{byId.has(id) ? nameOf(byId.get(id)!, t) : id}</span><span className="tabular-nums">{have}/{qty}</span></li>
      })}
    </ul>
  )
}

/** Antes e depois lado a lado (o servidor manda os dois bônus pela régua). */
export function BeforeAfter({ before, after, t, left, right }: { before: UpgradeView["bonusBefore"]; after: UpgradeView["bonusAfter"]; t: GearTr; left: string; right: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 text-[12px]" style={{ color: AE.text }}>
      <div><p className="mb-1 font-bold" style={{ color: AE.muted }}>{left}</p>{bonusLines(before, t).map(line => <p key={line}>{line}</p>)}</div>
      <div><p className="mb-1 font-bold" style={{ color: AE.good }}>{right}</p>{bonusLines(after, t).map(line => <p key={line}>{line}</p>)}</div>
    </div>
  )
}

export const affordable = (bag: GearBag, coins: number, needs: Record<string, number>) =>
  bag.coins >= coins && Object.entries(needs).every(([id, n]) => (bag.owned[id]?.qty || 0) >= n)

export function RefinementCard({ item, inst, bag, byId, t, act, busy }: {
  item: GearItem; inst: GearInstance; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const view = bag.forge?.[inst.id]?.upgrade ?? null
  const can = !!view && !view.blocked && affordable(bag, view.coins, view.needs)
  const subtitle = t("upgradeState", "+{plus} · grau {grade}").replace("{plus}", String(inst.plus)).replace("{grade}", gradeName(inst.grade))
    + (inst.equippedHere ? " · " + t("upgradeWorn", "equipada") : "") + (inst.ascended ? " · " + t("upgradeAscended", "ascendida") : "")
  return (
    <GearItemCard item={item} t={t} subtitle={subtitle}>
      <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("upgradeTitle", "Aprimoramento garantido")}</p>
      {!view ? <p className="text-[13px]" style={{ color: AE.muted }}>{t("upgradeMax", "No +15: o máximo.")}</p> : <>
        <p className="text-[14px] font-bold" style={{ color: AE.text }}>{t("upgradeStep", "+{from} → +{to}").replace("{from}", String(view.from)).replace("{to}", String(view.to))}</p>
        <BeforeAfter before={view.bonusBefore} after={view.bonusAfter} t={t} left={t("refineCurrent", "Atual")} right={t("upgradeNext", "Depois")} />
        <Costs coins={view.coins} needs={view.needs} bag={bag} byId={byId} t={t} />
        {view.blocked === "ascend" && <p className="text-[12px]" style={{ color: AE.bad }}>{t("upgradeNeedAscend", "Do +11 em diante, só depois da Ascensão da peça.")}</p>}
        <p className="text-[12px]" style={{ color: AE.muted }}>{t("upgradeSure", "Sempre sobe: o custo é fixo e nada se perde.")}</p>
        {confirm ? <>
          <p className="text-[12px]" style={{ color: AE.goldSoft }}>{t("upgradeConfirm", "Gastar o custo acima e subir para +{to}?").replace("{to}", String(view.to))}</p>
          <AetherButton disabled={!can} busy={busy} onClick={() => { setConfirm(false); void act("upgrade-" + inst.id + "-" + view.to, (tk, key) => upgradeGear(tk, item.id, key, inst.id), t("upgradeDone", "Aprimorado!")) }}>{t("gearConfirm", "Confirmar")}</AetherButton>
          <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("gearCancel", "Voltar")}</AetherButton>
        </> : <AetherButton disabled={!can || busy} onClick={() => setConfirm(true)}>{can ? t("upgradeGo", "Aprimorar para +{to}").replace("{to}", String(view.to)) : view.blocked ? t("upgradeBlocked", "Precisa da Ascensão") : t("refineMissing", "Faltam moedas ou materiais")}</AetherButton>}
      </>}
    </GearItemCard>
  )
}
