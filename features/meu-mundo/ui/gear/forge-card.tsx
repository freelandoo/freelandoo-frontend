"use client"
import { useState } from "react"
import { forgeGear, type GearBag, type GearItem, type GearRecipe } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { GearItemCard, bonusLines, nameOf, type GearAction, type GearTr } from "./gear-card"

export function ForgeCard({ item, recipe, bag, byId, t, busy, act }: {
  item: GearItem; recipe: GearRecipe; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; busy: boolean; act: GearAction
}) {
  const [confirm, setConfirm] = useState(false)
  const learned = !recipe.recipe || bag.learnedRecipes?.includes(recipe.recipe) || !!bag.owned[recipe.recipe]
  const lacks = Object.entries(recipe.needs).some(([id, qty]) => (bag.owned[id]?.qty || 0) < qty)
  const canForge = learned && !lacks && bag.coins >= recipe.coins && bag.level >= recipe.level && (item.stack || !bag.owned[item.id])
  const parts = Object.entries(recipe.needs).filter(([id]) => byId.get(id)?.component)
  const completed = parts.filter(([id, qty]) => (bag.owned[id]?.qty || 0) >= qty).length
  return (
    <GearItemCard item={item} t={t} subtitle={t("forgeRecipePrice", "{n} moedas · nível {level}").replace("{n}", String(recipe.coins)).replace("{level}", String(recipe.level))} lines={bonusLines(item.bonus, t)}>
      {recipe.kind === "assembly" && <p className="text-[14px] font-bold" style={{ color: AE.goldSoft }}>{t("forgeAssemblyProgress", "Partes prontas: {ready}/{total}").replace("{ready}", String(completed)).replace("{total}", String(parts.length))}</p>}
      <ul className="grid gap-1 text-[12px]" aria-label={t("forgeRequired", "Materiais necessários")}>
        {Object.entries(recipe.needs).map(([id, qty]) => {
          const count = bag.owned[id]?.qty || 0
          const material = byId.get(id)
          return <li key={id} className="flex justify-between gap-2" style={{ color: count >= qty ? AE.good : AE.muted }}><span>{material ? nameOf(material, t) : id}</span><span className="shrink-0 tabular-nums">{count}/{qty}</span></li>
        })}
      </ul>
      {!learned && <p className="text-[12px]" style={{ color: AE.bad }}>{t("gearNeedRecipe", "Falta aprender a receita")}</p>}
      {bag.level < recipe.level && <p className="text-[12px]" style={{ color: AE.bad }}>{t("gearNeedLevel", "Precisa do nível {n}").replace("{n}", String(recipe.level))}</p>}
      {!item.stack && !!bag.owned[item.id] && <p className="text-[12px]" style={{ color: AE.good }}>{t("gearOwned", "Já é seu")}</p>}
      {recipe.kind === "part" && <p className="text-[12px]" style={{ color: AE.muted }}>{t("forgeOnePart", "Esta fabricação cria uma peça. Reúna todas as partes para montar a arma.")}</p>}
      {recipe.kind === "assembly" && <p className="text-[12px]" style={{ color: AE.muted }}>{t("forgeGuaranteed", "Montagem garantida. As peças e moedas são consumidas uma vez.")}</p>}
      {confirm ? <>
        <p className="text-[12px]" style={{ color: AE.goldSoft }}>{t("forgeConfirmCost", "Confirmar o consumo dos materiais acima e de {n} moedas?").replace("{n}", String(recipe.coins))}</p>
        <AetherButton disabled={!canForge} busy={busy} onClick={() => void act("forge-" + recipe.id, (tk, key) => forgeGear(tk, recipe.id, key), t("gearForged", "Forjado!"))}>{t("gearConfirm", "Confirmar")}</AetherButton>
        <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("gearCancel", "Voltar")}</AetherButton>
      </> : <AetherButton disabled={!canForge || busy} onClick={() => setConfirm(true)}>{recipe.kind === "assembly" ? t("forgeAssemble", "Montar arma completa") : t("gearForge", "Forjar")}</AetherButton>}
    </GearItemCard>
  )
}
