"use client"
// Receitas da Forja (escudos, proteções, acessórios, preparos). 24/11/2026: a carta é só a arte + o nome; o
// detalhe explica O QUE A RECEITA FAZ, O QUE PRECISA (materiais com quanto tem, Esmeraldas, nível, receita
// aprendida) e tem o botão; embaixo, a ficha inteira do item que sai.
import { useState, type ReactNode } from "react"
import { forgeGear, type GearBag, type GearItem, type GearRecipe } from "../../data"
import { AetherButton } from "../kit/aether-modal"
import { AE } from "../kit/aether-tokens"
import { GearItemCard, nameOf, type GearAction, type GearTr } from "./gear-card"
import { FactRows, FactSection } from "./item-facts"

const num = (n: number) => n.toLocaleString("pt-BR")

/** O que a receita faz, pelo tipo. */
function recipeDoes(recipe: GearRecipe, item: GearItem, t: GearTr): string {
  const out = (recipe.qty && recipe.qty > 1 ? recipe.qty + "× " : "") + nameOf(item, t)
  switch (recipe.kind) {
    case "fragment": return t("recipeDoesFragment", "Junta os fragmentos da peça com os materiais abaixo e fabrica {out}. Sempre dá certo.").replace("{out}", out)
    case "part": return t("recipeDoesPart", "Fabrica a peça {out}. Reúna todas as partes para montar a arma.").replace("{out}", out)
    case "assembly": return t("recipeDoesAssembly", "Monta {out} com as partes abaixo. Montagem garantida.").replace("{out}", out)
    case "conversion": return t("recipeDoesConversion", "Converte os materiais abaixo em {out}.").replace("{out}", out)
    case "prep": return t("recipeDoesPrep", "Prepara {out}: um reforço para usar antes da luta.").replace("{out}", out)
    default: return t("recipeDoesEquipment", "Fabrica {out} com os materiais abaixo.").replace("{out}", out)
  }
}

export function ForgeCard({ item, recipe, bag, byId, t, busy, act }: {
  item: GearItem; recipe: GearRecipe; bag: GearBag; byId: Map<string, GearItem>; t: GearTr; busy: boolean; act: GearAction
}) {
  const [confirm, setConfirm] = useState(false)
  const learned = !recipe.recipe || bag.learnedRecipes?.includes(recipe.recipe) || !!bag.owned[recipe.recipe]
  const lacks = Object.entries(recipe.needs).some(([id, qty]) => (bag.owned[id]?.qty || 0) < qty)
  const canForge = learned && !lacks && bag.coins >= recipe.coins && bag.level >= recipe.level && (item.stack || !bag.owned[item.id])
  const parts = Object.entries(recipe.needs).filter(([id]) => byId.get(id)?.component)
  const completed = parts.filter(([id, qty]) => (bag.owned[id]?.qty || 0) >= qty).length
  const ok = AE.good, bad = AE.bad
  const rows: [string, ReactNode][] = [
    [t("recipeCost", "Custo"), <span key="c" style={{ color: bag.coins >= recipe.coins ? ok : bad }}>{t("gearPrice", "{p} moedas").replace("{p}", num(recipe.coins))}</span>],
    [t("itemFactLevel", "Nível pedido"), <span key="l" style={{ color: bag.level >= recipe.level ? ok : bad }}>{num(recipe.level)}</span>],
  ]
  if (recipe.recipe) rows.push([t("recipeLearned", "Receita aprendida"), <span key="r" style={{ color: learned ? ok : bad }}>{learned ? t("itemYes", "Sim") : t("itemNo", "Não")}</span>])
  return (
    <GearItemCard item={item} t={t} bag={bag} byId={byId}>
      <FactSection title={t("recipeSecDoes", "O que a receita faz")}>
        <p className="text-[13px]" style={{ color: AE.text }}>{recipeDoes(recipe, item, t)}</p>
        {recipe.kind === "assembly" && <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("forgeAssemblyProgress", "Partes prontas: {ready}/{total}").replace("{ready}", String(completed)).replace("{total}", String(parts.length))}</p>}
      </FactSection>
      <FactSection title={t("recipeSecNeeds", "O que precisa")}>
        <ul className="grid gap-1 p-2 text-[12px]" style={{ background: AE.well }} aria-label={t("forgeRequired", "Materiais necessários")}>
          {Object.entries(recipe.needs).map(([id, qty]) => {
            const count = bag.owned[id]?.qty || 0
            const material = byId.get(id)
            return <li key={id} className="flex justify-between gap-2" style={{ color: count >= qty ? ok : AE.muted }}><span>{material ? nameOf(material, t) : id}</span><span className="shrink-0 font-semibold tabular-nums">{num(count)} / {num(qty)}</span></li>
          })}
        </ul>
        <FactRows rows={rows} />
      </FactSection>
      {!learned && <p className="text-[12px]" style={{ color: bad }}>{t("gearNeedRecipe", "Falta aprender a receita")}</p>}
      {bag.level < recipe.level && <p className="text-[12px]" style={{ color: bad }}>{t("gearNeedLevel", "Precisa do nível {n}").replace("{n}", String(recipe.level))}</p>}
      {!item.stack && !!bag.owned[item.id] && <p className="text-[12px]" style={{ color: ok }}>{t("gearOwned", "Já é seu")}</p>}
      {confirm ? <>
        <p className="text-[12px]" style={{ color: AE.goldSoft }}>{t("forgeConfirmCost", "Confirmar o consumo dos materiais acima e de {n} moedas?").replace("{n}", String(recipe.coins))}</p>
        <AetherButton disabled={!canForge} busy={busy} onClick={() => void act("forge-" + recipe.id, (tk, key) => forgeGear(tk, recipe.id, key), t("gearForged", "Forjado!"))}>{t("gearConfirm", "Confirmar")}</AetherButton>
        <AetherButton tone="secondary" disabled={busy} onClick={() => setConfirm(false)}>{t("gearCancel", "Voltar")}</AetherButton>
      </> : <AetherButton disabled={!canForge || busy} onClick={() => setConfirm(true)}>{recipe.kind === "assembly" ? t("forgeAssemble", "Montar arma completa") : t("gearForge", "Forjar")}</AetherButton>}
    </GearItemCard>
  )
}
