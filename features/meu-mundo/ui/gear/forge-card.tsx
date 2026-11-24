"use client"
// Receitas da Forja (proteções, amuletos, Cápsulas, preparos). 24/11/2026 — regra nova do Alex: não existe mais
// fabricação por material, TUDO por fragmento. A carta é só a arte + o nome + "fragmentos X/N"; o detalhe diz o que
// a receita faz e o que precisa (os fragmentos do item, as moedas e o nível) e tem o botão; embaixo, a ficha do item.
import { useState, type ReactNode } from "react"
import { forgeGear, type GearBag, type GearItem, type GearRecipe } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { GearItemCard, nameOf, type GearAction, type GearTr } from "./gear-card"
import { FactRows, FactSection } from "./item-facts"

const num = (n: number) => n.toLocaleString("pt-BR")

/** Os fragmentos da receita: o (único) ingrediente, quanto tem e quanto pede. */
export function recipeFragments(recipe: GearRecipe, bag: GearBag) {
  const [id, need] = Object.entries(recipe.needs)[0] || ["", 0]
  return { id, need, have: bag.owned[id]?.qty || 0 }
}

/** O que a receita faz, pelo tipo. */
function recipeDoes(recipe: GearRecipe, item: GearItem, need: number, t: GearTr): string {
  const out = (recipe.qty && recipe.qty > 1 ? recipe.qty + "× " : "") + nameOf(item, t)
  const key = recipe.kind === "prep" ? "recipeDoesPrepFrag" : "recipeDoesFragOnly"
  const fallback = recipe.kind === "prep"
    ? "Junta {n} fragmentos e prepara {out}: um reforço para usar antes da luta. Sempre dá certo."
    : "Junta {n} fragmentos e fabrica {out}. Sempre dá certo."
  return t(key, fallback).replace("{n}", num(need)).replace("{out}", out)
}

export function ForgeCard({ item, recipe, bag, byId, t, busy, act }: {
  item: GearItem; recipe: GearRecipe; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; busy: boolean; act: GearAction
}) {
  const [confirm, setConfirm] = useState(false)
  const frag = recipeFragments(recipe, bag)
  const fragItem = byId.get(frag.id)
  const hasFrags = frag.have >= frag.need
  const owned = !item.stack && !!bag.owned[item.id]
  const canForge = hasFrags && bag.coins >= recipe.coins && bag.level >= recipe.level && !owned
  const ok = AE.good, bad = AE.bad
  const pct = frag.need ? Math.min(100, Math.round((frag.have / frag.need) * 100)) : 0
  const rows: [string, ReactNode][] = [
    [t("recipeFragments", "Fragmentos"), <span key="f" style={{ color: hasFrags ? ok : bad }}>{num(frag.have)} / {num(frag.need)}</span>],
    [t("recipeCost", "Custo"), <span key="c" style={{ color: bag.coins >= recipe.coins ? ok : bad }}>{t("gearPrice", "{p} moedas").replace("{p}", num(recipe.coins))}</span>],
    [t("itemFactLevel", "Nível pedido"), <span key="l" style={{ color: bag.level >= recipe.level ? ok : bad }}>{num(recipe.level)}</span>],
  ]
  return (
    <GearItemCard item={item} t={t} bag={bag} byId={byId} sub={t("recipeFragShort", "Fragmentos {have}/{need}").replace("{have}", num(frag.have)).replace("{need}", num(frag.need))}>
      <FactSection title={t("recipeSecDoes", "O que a receita faz")}>
        <p className="text-[13px]" style={{ color: AE.text }}>{recipeDoes(recipe, item, frag.need, t)}</p>
        {fragItem && <p className="text-[12px]" style={{ color: AE.muted }}>{t("recipeFragWhere", "Os fragmentos ({name}) caem nas lutas, nos Domínios e nos minijogos: veja \"De onde vem\" logo abaixo.").replace("{name}", nameOf(fragItem, t))}</p>}
      </FactSection>
      <FactSection title={t("recipeSecNeeds", "O que precisa")}>
        <div className="grid gap-1 p-2" style={{ background: AE.well }}>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} role="progressbar" aria-valuemin={0} aria-valuemax={frag.need} aria-valuenow={Math.min(frag.have, frag.need)} aria-label={t("recipeFragments", "Fragmentos")}>
            <div className="h-full rounded-full" style={{ width: pct + "%", background: hasFrags ? ok : AE.goldSoft }} />
          </div>
        </div>
        <FactRows rows={rows} />
      </FactSection>
      {bag.level < recipe.level && <p className="text-[12px]" style={{ color: bad }}>{t("gearNeedLevel", "Precisa do nível {n}").replace("{n}", String(recipe.level))}</p>}
      {owned && <p className="text-[12px]" style={{ color: ok }}>{t("gearOwned", "Já é seu")}</p>}
      {confirm ? <>
        <p className="text-[12px]" style={{ color: AE.goldSoft }}>{t("forgeConfirmFrag", "Gastar {n} fragmentos e {c} moedas?").replace("{n}", num(frag.need)).replace("{c}", num(recipe.coins))}</p>
        <AetherButton disabled={!canForge} busy={busy} onClick={() => void act("forge-" + recipe.id, (tk, key) => forgeGear(tk, recipe.id, key), t("gearForged", "Forjado!"))}>{t("gearConfirm", "Confirmar")}</AetherButton>
        <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("gearCancel", "Voltar")}</AetherButton>
      </> : <AetherButton disabled={!canForge || busy} onClick={() => setConfirm(true)}>{t("gearForge", "Forjar")}</AetherButton>}
    </GearItemCard>
  )
}
