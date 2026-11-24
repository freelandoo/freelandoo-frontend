"use client"

// features/meu-mundo/ui/gear/item-facts.tsx — 24/11/2026 (pedido do Alex): o detalhe lista TODOS os atributos do
// item — classe, tipo, encaixe, nível pedido, quem usa, status da classe (número e %), bônus da peça, conjunto,
// engastes, preço/venda, o que o fragmento/pó/preparo/runa faz, a cópia (nível, XP, estrelas, bônus de agora),
// descrição, de onde vem e para que serve. Tudo do catálogo do servidor (`GearItem`) e da mochila (`GearBag`):
// nada é calculado aqui.

import type { ReactNode } from "react"
import type { GearBag, GearInstance, GearItem, GearSlot } from "../../data"
import { AE, RANK, rankOf } from "../kit/aether-tokens"
import { RankSeal } from "../kit/rank-seal"
import { teko } from "../status/evo-skin"
import { ClassStats, bonusLines, gearLock, nameOf, type GearTr } from "./gear-card"
import { WeaponStars } from "./weapon-marks"

/** Nome do slot (as mesmas chaves da página Equipado). */
export const gearSlotName = (s: GearSlot, t: GearTr) =>
  ({
    weapon: t("lkSlotWeapon", "Arma"),
    offhand: t("lkSlotOffhand", "Mão secundária"),
    helm: t("lkSlotHelm", "Cabeça"),
    chest: t("lkSlotChest", "Peito"),
    gloves: t("lkSlotGloves", "Mãos"),
    boots: t("lkSlotBoots", "Pés"),
    amulet: t("lkSlotAmulet", "Amuleto"),
    relic: t("lkSlotRelic", "Relíquia"),
  })[s]

/** Tipo da peça pelo `stats.kind` do servidor (a divisão do número e da %). */
const KIND: Record<string, [string, string]> = {
  sword: ["itemKindSword", "Espada"], staff: ["itemKindStaff", "Cajado"], heavy: ["itemKindHeavy", "Arma pesada"],
  bow: ["itemKindBow", "Arco"], gun: ["itemKindGun", "Arma de fogo"], shield: ["itemKindShield", "Escudo"],
  chest: ["itemKindChest", "Armadura"], helm: ["itemKindHelm", "Elmo"], gloves: ["itemKindGloves", "Luvas"],
  boots: ["itemKindBoots", "Botas"], amulet: ["itemKindAmulet", "Amuleto"], relic: ["itemKindRelic", "Relíquia"],
}
const CATEGORY: Record<string, [string, string]> = {
  weapon: ["forgeWeapons", "Armas"], shield: ["forgeShields", "Escudos"], armor: ["forgeArmor", "Proteções"],
  accessory: ["forgeAccessories", "Acessórios"], material: ["forgeMaterials", "Materiais e peças"],
  recipe: ["forgeRecipes", "Projetos"], quest: ["forgeQuestItems", "Missão"], cosmetic: ["forgeCosmetics", "Cosméticos"],
}
const num = (n: number) => n.toLocaleString("pt-BR")

export function FactSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-1.5">
      <h5 className={`${teko.className} text-[18px] font-semibold uppercase leading-none tracking-wide`} style={{ color: AE.goldSoft }}>{title}</h5>
      {children}
    </section>
  )
}

/** Linhas "rótulo · valor" num poço. */
export function FactRows({ rows }: { rows: [string, ReactNode][] }) {
  if (!rows.length) return null
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 p-2 text-[12px]" style={{ background: AE.well }}>
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt style={{ color: AE.muted }}>{k}</dt>
          <dd className="text-right font-semibold" style={{ color: AE.text }}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

const Lines = ({ lines, color = AE.aether }: { lines: string[]; color?: string }) =>
  lines.length ? <ul className="grid gap-0.5 text-[12px] font-semibold" style={{ color }}>{lines.map((l) => <li key={l}>{l}</li>)}</ul> : null

/**
 * A ficha inteira do item. `inst` = a cópia (arma: nível, XP, estrelas e o bônus de agora vêm de `bag.forge`);
 * sem `inst`, usa a cópia representante da mochila (`bag.owned[id].instance`), se houver.
 */
export function ItemFacts({ item, t, bag, inst, byId }: { item: GearItem; t: GearTr; bag?: GearBag | null; inst?: GearInstance | null; byId?: Map<string, GearItem> }) {
  const rank = rankOf(item)
  const copy = inst ?? (bag?.owned[item.id]?.instance ? bag.instances?.find((x) => x.id === bag.owned[item.id]!.instance) : null) ?? null
  const forge = copy ? bag?.forge?.[copy.id] : null
  const rules = bag?.progression
  const lock = bag ? gearLock(item, bag, t) : null
  const name = (id: string) => (byId?.get(id) ? nameOf(byId.get(id)!, t) : id)
  const yes = t("itemYes", "Sim")

  const sheet: [string, ReactNode][] = [
    [t("itemFactRank", "Classe"), <span key="r" className="inline-flex items-center gap-1.5"><RankSeal rank={rank} t={t} size="sm" />{t(RANK[rank].labelKey, RANK[rank].label)}</span>],
    [t("itemFactType", "Tipo"), item.stats?.kind && KIND[item.stats.kind] ? t(KIND[item.stats.kind][0], KIND[item.stats.kind][1]) : CATEGORY[item.category] ? t(CATEGORY[item.category][0], CATEGORY[item.category][1]) : item.category],
  ]
  if (item.slot) sheet.push([t("itemFactSlot", "Encaixe"), gearSlotName(item.slot, t)])
  if (item.twoHanded) sheet.push([t("itemFactTwoHanded", "Duas mãos"), t("itemTwoHandedYes", "Sim — tira a mão secundária")])
  if (item.level > 1 || item.slot) sheet.push([t("itemFactLevel", "Nível pedido"), num(item.level)])
  if (bag && item.slot) sheet.push([t("itemFactWho", "Quem usa"), lock ? <span key="l" style={{ color: AE.bad }}>{lock}</span> : <span key="l" style={{ color: AE.good }}>{t("itemWhoYou", "Você pode usar")}</span>])
  if (item.set) sheet.push([t("itemFactSet", "Conjunto"), t("gearSet_" + item.set, item.set)])
  if (item.sockets) sheet.push([t("itemFactSockets", "Engastes"), num(item.sockets)])
  if (item.price != null) sheet.push([t("itemFactPrice", "Preço na loja"), t("gearPrice", "{p} moedas").replace("{p}", num(item.price))])
  if (item.sell > 0) sheet.push([t("itemFactSell", "Vende por"), t("gearPrice", "{p} moedas").replace("{p}", num(item.sell))])
  if (item.stack) sheet.push([t("itemFactStack", "Empilha"), yes])
  if (bag?.owned[item.id]) sheet.push([t("itemFactOwned", "Na mochila"), num(bag.owned[item.id].qty)])

  // o que a pilha faz (fragmento, pó, preparo, runa)
  const does: string[] = []
  if (item.fragment) {
    const of = item.fragment.of ? name(item.fragment.of) : item.fragment.set ? t("gearSet_" + item.fragment.set, item.fragment.set) : item.fragment.rank ? t(RANK[item.fragment.rank as keyof typeof RANK]?.labelKey ?? "", item.fragment.rank) : ""
    does.push(t("itemFragmentDoes", "Junte {n} para fabricar {of}.").replace("{n}", num(item.fragment.need)).replace("{of}", of))
  }
  if (item.powder) does.push(t("itemPowderDoes", "Refina armas da classe {r}: cada tentativa gasta 1.").replace("{r}", t(RANK[item.powder.rank as keyof typeof RANK]?.labelKey ?? "", item.powder.rank)))
  if (item.prep) does.push(t("itemPrepDoes", "Preparo: soma na próxima luta.") + " " + (bonusLines({ [item.prep.key]: item.prep.v }, t)[0] || ""))
  if (item.rune) does.push(t("itemRuneDoes", "Runa grau {g}: engasta numa peça.").replace("{g}", String(item.rune.grade)))

  const copyRows: [string, ReactNode][] = []
  if (copy?.weaponLevel) {
    copyRows.push([t("itemFactWeaponLevel", "Nível da arma"), `${num(copy.weaponLevel)} / ${num(rules?.maxLevel || 90)}`])
    if (forge?.refine) copyRows.push([t("itemFactXp", "XP do nível"), `${num(forge.refine.xp)} / ${num(forge.refine.need)}`])
    copyRows.push([t("itemFactStars", "Estrelas"), <WeaponStars key="s" stars={copy.stars || 1} max={rules?.maxStars || 5} size={12} t={t} />])
  } else if (copy) {
    if (copy.plus) copyRows.push([t("itemFactPlus", "Aprimoramento"), "+" + copy.plus])
  }
  if (copy) copyRows.push([t("itemFactEquipped", "Equipada"), copy.equippedHere ? t("itemEquippedHere", "Neste personagem") : copy.equippedBy ? t("itemEquippedOther", "Em outro personagem") : t("itemEquippedNo", "Solta na mochila")])
  const nowBonus = forge?.bonus ? bonusLines(forge.bonus, t) : []
  const baseBonus = bonusLines(item.bonus, t)

  return (
    <div className="grid gap-3">
      <FactSection title={t("itemSecSheet", "Ficha")}><FactRows rows={sheet} /></FactSection>
      {item.stats && <FactSection title={t("itemSecClassStats", "Status da classe")}><ClassStats stats={item.stats} t={t} /></FactSection>}
      {!!copyRows.length && (
        <FactSection title={t("itemSecCopy", "Esta cópia")}>
          <FactRows rows={copyRows} />
          {!!nowBonus.length && <p className="text-[11px] font-semibold uppercase" style={{ color: AE.muted }}>{t("itemBonusNow", "Bônus de agora (nível e estrelas)")}</p>}
          <Lines lines={nowBonus} />
        </FactSection>
      )}
      {!!baseBonus.length && <FactSection title={t("itemSecBonus", "Bônus da peça")}><Lines lines={baseBonus} /></FactSection>}
      {!!does.length && <FactSection title={t("itemSecDoes", "O que faz")}><Lines lines={does} color={AE.text} /></FactSection>}
      {item.description && <FactSection title={t("itemSecAbout", "Sobre")}><p className="text-[12px]" style={{ color: AE.muted }}>{t("gearDesc_" + item.id, item.description)}</p></FactSection>}
      {!!item.source?.length && (
        <FactSection title={t("itemSecSource", "De onde vem")}>
          <ul className="grid list-disc gap-0.5 pl-4 text-[12px]" style={{ color: AE.muted }}>{t("gearSource_" + item.id, item.source.join(" · ")).split(" · ").map((s, i) => <li key={i}>{s}</li>)}</ul>
        </FactSection>
      )}
      {!!item.uses?.length && (
        <FactSection title={t("itemSecUses", "Para que serve")}>
          <ul className="grid list-disc gap-0.5 pl-4 text-[12px]" style={{ color: AE.muted }}>{t("gearUses_" + item.id, item.uses.join(" · ")).split(" · ").map((s, i) => <li key={i}>{s}</li>)}</ul>
        </FactSection>
      )}
    </div>
  )
}
