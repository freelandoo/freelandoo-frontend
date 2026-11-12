"use client"
// Bancada da Forja, por CÓPIA (trilha E2). Trilha E9: aprimoramento garantido (forge-v2) — custo fixo
// do próximo passo, bônus antes e depois e um botão; sempre sobe. Trilha E10: refinamento I–V (grau
// de qualidade, separado do +N), mesmo desenho. O servidor diz o custo e confere tudo.
import { useState, type ReactNode } from "react"
import { ascendGear, awakenGear, gradeGear, upgradeGear, type GearBag, type GearInstance, type GearItem, type UpgradeView } from "../../data"
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

/** E10: o grau de qualidade da cópia (I…V). */
function GradeSection({ item, inst, bag, byId, t, act, busy }: {
  item: GearItem; inst: GearInstance; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const view = bag.forge?.[inst.id]?.grade ?? null
  const can = !!view && affordable(bag, view.coins, view.needs)
  return (
    <div className="grid gap-2 pt-2" style={{ borderTop: "1px solid " + AE.brassLine }}>
      <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("gradeTitle", "Refinamento I–V")}</p>
      {!view ? <p className="text-[13px]" style={{ color: AE.muted }}>{t("gradeMax", "No grau V: o máximo.")}</p> : <>
        <p className="text-[14px] font-bold" style={{ color: AE.text }}>{t("gradeStep", "Grau {from} → {to}").replace("{from}", gradeName(view.from)).replace("{to}", gradeName(view.to))}</p>
        <BeforeAfter before={view.bonusBefore} after={view.bonusAfter} t={t} left={t("refineCurrent", "Atual")} right={t("upgradeNext", "Depois")} />
        <Costs coins={view.coins} needs={view.needs} bag={bag} byId={byId} t={t} />
        {confirm ? <>
          <p className="text-[12px]" style={{ color: AE.goldSoft }}>{t("gradeConfirm", "Gastar o custo acima e refinar para o grau {to}?").replace("{to}", gradeName(view.to))}</p>
          <AetherButton disabled={!can} busy={busy} onClick={() => { setConfirm(false); void act("grade-" + inst.id + "-" + view.to, (tk, key) => gradeGear(tk, item.id, key, inst.id), t("gradeDone", "Refinado!")) }}>{t("gearConfirm", "Confirmar")}</AetherButton>
          <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("gearCancel", "Voltar")}</AetherButton>
        </> : <AetherButton tone="secondary" disabled={!can || busy} onClick={() => setConfirm(true)}>{can ? t("gradeGo", "Refinar para o grau {to}").replace("{to}", gradeName(view.to)) : t("refineMissing", "Faltam moedas ou materiais")}</AetherButton>}
      </>}
    </div>
  )
}

/** E14: Ascensão (no +10) e Despertar (depois dela). O servidor diz o custo ou o motivo. */
function AscendSection({ inst, bag, byId, t, act, busy }: {
  inst: GearInstance; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean
}) {
  const forge = bag.forge?.[inst.id]
  const asc = forge?.ascend
  const awk = forge?.awaken
  if (!asc && !awk) return null
  const row = (title: string, view: typeof asc, done: boolean, doneText: string, why: Record<string, string>, go: string, run: () => void, extra?: ReactNode) => (
    <div className="grid gap-2">
      <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{title}</p>
      {done ? <p className="text-[12px]" style={{ color: AE.good }}>{doneText}</p>
        : view?.error ? <p className="text-[12px]" style={{ color: AE.muted }}>{why[view.error] ?? why.default}</p>
        : view?.needs ? <>
          {extra}
          <Costs coins={view.coins || 0} needs={view.needs} bag={bag} byId={byId} t={t} />
          <AetherButton disabled={busy || !affordable(bag, view.coins || 0, view.needs)} onClick={run}>{affordable(bag, view.coins || 0, view.needs) ? go : t("refineMissing", "Faltam moedas ou materiais")}</AetherButton>
        </> : null}
    </div>
  )
  return (
    <div className="grid gap-3 pt-2" style={{ borderTop: "1px solid " + AE.brassLine }}>
      {row(t("ascendTitle", "Ascensão"), asc, !!inst.ascended, t("ascendDone", "Ascendida: aprimora até o +15 e tem um engaste a mais."),
        { plus: t("ascendNeedPlus", "Leve a peça ao +10 para ascender."), default: t("gearNothing", "Nada por aqui ainda.") },
        t("ascendGo", "Ascender"), () => void act("ascend-" + inst.id, (tk, key) => ascendGear(tk, inst.id, key, inst.version), t("ascendOk", "A peça ascendeu!")))}
      {row(t("awakenTitle", "Despertar"), awk, !!inst.awakened, t("awakenDone", "Desperta: a passiva está ligada e a arma acende na luta."),
        { notascended: t("awakenNeedAscend", "O Despertar vem depois da Ascensão."), default: t("gearNothing", "Nada por aqui ainda.") },
        t("awakenGo", "Despertar"), () => void act("awaken-" + inst.id, (tk, key) => awakenGear(tk, inst.id, key, inst.version), t("awakenOk", "A peça despertou!")),
        awk?.bonus ? <p className="text-[12px]" style={{ color: AE.good }}>{bonusLines(awk.bonus, t).join(" · ")}</p> : null)}
    </div>
  )
}

export function RefinementCard({ item, inst, bag, byId, t, act, busy }: {
  item: GearItem; inst: GearInstance; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; act: GearAction; busy: boolean
}) {
  const [confirm, setConfirm] = useState(false)
  const view = bag.forge?.[inst.id]?.upgrade ?? null
  const can = !!view && !view.blocked && affordable(bag, view.coins, view.needs)
  const subtitle = t("upgradeState", "+{plus} · grau {grade}").replace("{plus}", String(inst.plus)).replace("{grade}", gradeName(inst.grade))
    + (inst.equippedHere ? " · " + t("upgradeWorn", "equipada") : "") + (inst.ascended ? " · " + t("upgradeAscended", "ascendida") : "") + (inst.awakened ? " · " + t("upgradeAwakened", "desperta") : "")
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
      <GradeSection item={item} inst={inst} bag={bag} byId={byId} t={t} act={act} busy={busy} />
      <AscendSection inst={inst} bag={bag} byId={byId} t={t} act={act} busy={busy} />
    </GearItemCard>
  )
}
