"use client"

import { useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { equipGear, recycleGear, applyGearItem, type GearCategory, type GearItem, type GearSlot, type Receipt } from "../../data"
import { AetherModal, AetherButton } from "../kit/aether-modal"
import { AetherCarousel, AetherTabs, type CarouselItem } from "../kit/aether-carousel"
import { AE } from "../kit/aether-tokens"
import { GearItemCard, bonusLines, gearLock, nameOf, type GearTr } from "./gear-card"
import { ForgeCard } from "./forge-card"
import { RefinementCard } from "./refinement-card"
import { useWorkshop } from "./use-workshop"

/** B5: comprar (Armeiro e Loja de Armas) saiu daqui para a Loja única (ui/shop/shop-panel.tsx). */
export type GearTab = "bag" | "forge" | "refine" | "guide"
type ForgeKind = "assembly" | "part" | "equipment" | "conversion"
type Category = "all" | GearCategory

export default function GearPanel({ onClose, initialTab = "forge", onReceipt }: {
  onClose: () => void; initialTab?: GearTab; onReceipt?: (receipt: Receipt) => void
}) {
  const t = useTranslations("MeuMundo") as GearTr
  const { catalog, bag, busy, message, setMessage, error, load, act } = useWorkshop(t, onReceipt)
  const [tab, setTab] = useState<GearTab>(initialTab)
  const [category, setCategory] = useState<Category>("all")
  const [kind, setKind] = useState<ForgeKind>("assembly")
  const [confirm, setConfirm] = useState<string | null>(null)
  const byId = useMemo(() => new Map((catalog?.items || []).map(item => [item.id, item])), [catalog])
  const pending = (item: string) => bag?.pendingProposals?.some(proposal => proposal.item === item && proposal.status === "pending")
  const title = tab === "forge" ? t("centerPlace_forja", "Forja das Engrenagens") : tab === "refine" ? t("refineTitle", "Bancada de refinamento") : t("gearTitle", "Equipamento")
  // apresentação 04: a mochila virou tela própria (ui/bag/bag-panel.tsx); aqui é a bancada
  const tabs = [
    { id: "forge" as const, label: t("gearTabForge", "Forja") },
    { id: "refine" as const, label: t("refineTab", "Refinar") },
    { id: "guide" as const, label: t("forgeGuideTab", "Catálogo") },
  ]
  const categoryNames: Record<Category, string> = {
    all: t("forgeAll", "Todos"), weapon: t("forgeWeapons", "Armas"), shield: t("forgeShields", "Escudos"), armor: t("forgeArmor", "Proteções"),
    accessory: t("forgeAccessories", "Acessórios"), material: t("forgeMaterials", "Materiais e peças"),
    recipe: t("forgeRecipes", "Projetos"), quest: t("forgeQuestItems", "Missão"), cosmetic: t("forgeCosmetics", "Cosméticos"),
  }
  const changeTab = (next: GearTab) => { setTab(next); setConfirm(null); setMessage(null); setCategory("all") }
  const slotsFor = (item: GearItem): GearSlot[] => item.category === "weapon" ? ["weapon"] : item.category === "shield" ? ["shield"] : item.category === "armor" ? ["armor"] : item.category === "accessory" ? ["acc1", "acc2"] : []
  const locked = (item: GearItem) => gearLock(item, bag, t)

  const inventoryCard = (item: GearItem, guide: boolean): CarouselItem => ({
    key: item.id, label: nameOf(item, t), render: () => {
      if (!bag) return null
      const own = bag.owned[item.id]
      const slot = Object.entries(bag.equipped).find(([, id]) => id === item.id)?.[0] as GearSlot | undefined
      const slots = slotsFor(item)
      const lock = locked(item)
      return (
        <GearItemCard item={item} t={t} subtitle={own ? t("forgeOwnedCount", "Na mochila: {n}").replace("{n}", String(own.qty)) + (own.level ? " · +" + own.level : "") : t("forgeNotOwned", "Ainda não adquirido")} lines={bonusLines(item.bonus, t)}>
          {guide && item.assemblyParts?.length ? <p className="text-[13px] font-bold" style={{ color: AE.goldSoft }}>{t("forgePartCount", "{n} partes diferentes para montar").replace("{n}", String(item.assemblyParts.length))}</p> : null}
          {lock && <p className="text-[12px]" style={{ color: AE.bad }}>{lock}</p>}
          {pending(item.id) ? <AetherButton disabled={!!busy} onClick={() => changeTab("refine")}>{t("refinePending", "Resolver refinamento pendente")}</AetherButton> : own && slots.length ? (
            <AetherButton disabled={!!lock || !!busy} onClick={() => {
              const target = slot || slots.find(s => !bag.equipped[s]) || slots[0]
              void act("equip-" + item.id, (tk) => equipGear(tk, target, slot ? null : item.id), t("gearEquippedOk", "Equipamento atualizado."))
            }}>{slot ? t("gearUnequip", "Tirar") : t("gearEquip", "Equipar")}</AetherButton>
          ) : null}
          {own && item.use && item.use !== "equip" && <AetherButton disabled={!!busy} onClick={() => void act("use-" + item.id, (tk, key) => applyGearItem(tk, item.id, key), t("forgeUsed", "Uso registrado."))}>
            {item.use === "learn_recipe" ? t("forgeLearn", "Aprender projeto") : item.use === "inspect_quest" ? t("forgeRead", "Examinar registro") : item.use === "unlock_emote" ? t("forgeUnlockEmote", "Desbloquear gesto") : t("forgeApplyCosmetic", "Aplicar visual")}
          </AetherButton>}
          {own && item.category === "material" && item.sell > 0 && (
            confirm === "recycle-" + item.id ? <>
              <p className="text-[12px]" style={{ color: AE.bad }}>{t("forgeRecycleConfirm", "Consumir 1 unidade por {n} moedas?").replace("{n}", String(item.sell))}</p>
              <AetherButton busy={!!busy} onClick={() => { void act("recycle-" + item.id, (tk, key) => recycleGear(tk, item.id, 1, key)); setConfirm(null) }}>{t("gearConfirm", "Confirmar")}</AetherButton>
              <AetherButton tone="secondary" onClick={() => setConfirm(null)}>{t("gearCancel", "Voltar")}</AetherButton>
            </> : <AetherButton tone="secondary" disabled={!!busy} onClick={() => setConfirm("recycle-" + item.id)}>{t("gearRecycleOne", "Reciclar 1")}</AetherButton>
          )}
        </GearItemCard>
      )
    },
  })
  let items: CarouselItem[] = []
  if (catalog && bag) {
    const filtered = catalog.items.filter(item => category === "all" || item.category === category)
    if (tab === "bag" || tab === "guide") items = filtered.filter(item => tab === "guide" || bag.owned[item.id]).map(item => inventoryCard(item, tab === "guide"))
    if (tab === "forge") items = catalog.recipes.filter(recipe => (recipe.kind || "equipment") === kind).filter(recipe => !byId.get(recipe.out)?.clan || byId.get(recipe.out)?.clan === bag.clan).map(recipe => ({
      key: recipe.id, label: byId.has(recipe.out) ? nameOf(byId.get(recipe.out)!, t) : recipe.out,
      render: () => byId.has(recipe.out) ? <ForgeCard item={byId.get(recipe.out)!} recipe={recipe} bag={bag} byId={byId} t={t} busy={!!busy} act={act} /> : null,
    }))
    if (tab === "refine") items = catalog.items.filter(item => bag.owned[item.id] && (item.category === "weapon" || item.category === "armor")).sort((a, b) => Number(!!pending(b.id)) - Number(!!pending(a.id))).map(item => ({
      key: item.id, label: nameOf(item, t), render: () => <RefinementCard item={item} bag={bag} byId={byId} t={t} busy={!!busy} act={act} />,
    }))
  }
  return (
    <AetherModal title={title} eyebrow={bag ? t("gearHeader", "Nível {lv} · {c} moedas").replace("{lv}", String(bag.level)).replace("{c}", String(bag.coins)) : undefined} onClose={onClose} width={680}>
      <AetherTabs label={t("gearTitle", "Equipamento")} tabs={tabs} value={tab} onChange={changeTab} />
      {tab === "forge" && <AetherTabs<ForgeKind> label={t("forgeKinds", "Bancadas da forja")} value={kind} onChange={setKind} tabs={[
        { id: "assembly", label: t("forgeWeapons", "Armas") }, { id: "part", label: t("forgeParts", "Peças") },
        { id: "equipment", label: t("forgeArmor", "Proteções") }, { id: "conversion", label: t("forgeConversions", "Conversões") },
      ]} />}
      {(tab === "bag" || tab === "guide") && <label className="mb-3 flex min-h-11 items-center gap-3 text-[13px]" style={{ color: AE.text }}>
        {t("forgeCategory", "Categoria")}
        <select value={category} onChange={event => setCategory(event.target.value as Category)} className="min-h-11 min-w-0 flex-1 px-2" style={{ color: AE.text, background: AE.well, border: "1px solid " + AE.brassLine }}>
          {Object.entries(categoryNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>}
      {!catalog || !bag ? <div className="grid min-h-48 place-items-center" style={{ color: AE.muted }}>{error ? <AetherButton onClick={() => void load()}>{t("forgeReload", "Tentar abrir novamente")}</AetherButton> : <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />}</div> : (
        <AetherCarousel key={tab + "-" + category + "-" + kind} title={title} items={items} cardWidth={360} cardHeight={510} empty={tab === "bag" ? t("gearBagEmpty", "Mochila vazia. Lute e jogue para ganhar materiais.") : t("gearNothing", "Nada por aqui ainda.")} />
      )}
      {message && <p role="status" className="mt-3 text-center text-[13px]" style={{ color: AE.goldSoft }}>{message}</p>}
    </AetherModal>
  )
}
