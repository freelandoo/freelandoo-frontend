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
import { FragmentIndex } from "./fragment-index"
import { SalvageCard, TransmutePanel } from "./salvage-card"
import { RuneFusePanel, RuneSocketCard } from "./rune-card"

/** B5: comprar (Armeiro e Loja de Armas) saiu daqui para a Loja única (ui/shop/shop-panel.tsx). */
export type GearTab = "bag" | "forge" | "refine" | "guide" | "fragments" | "salvage" | "runes"
type ForgeKind = "assembly" | "part" | "equipment" | "conversion" | "fragment" | "prep"
type Category = "all" | GearCategory

export default function GearPanel({ onClose, initialTab = "forge", onReceipt }: {
  onClose: () => void; initialTab?: GearTab; onReceipt?: (receipt: Receipt) => void
}) {
  const t = useTranslations("MeuMundo") as GearTr
  const { catalog, bag, busy, message, setMessage, error, load, act } = useWorkshop(t, onReceipt)
  const [tab, setTab] = useState<GearTab>(initialTab)
  const [category, setCategory] = useState<Category>("all")
  const [kind, setKind] = useState<ForgeKind>("assembly")
  const [salvageMode, setSalvageMode] = useState<"salvage" | "transmute">("salvage")
  const [runeMode, setRuneMode] = useState<"socket" | "fuse">("socket")
  const [confirm, setConfirm] = useState<string | null>(null)
  const byId = useMemo(() => new Map((catalog?.items || []).map(item => [item.id, item])), [catalog])
  const pending = (item: string) => bag?.pendingProposals?.some(proposal => proposal.item === item && proposal.status === "pending")
  const title = tab === "forge" ? t("centerPlace_forja", "Forja das Engrenagens") : tab === "refine" ? t("refineTitle", "Bancada de refinamento") : t("gearTitle", "Equipamento")
  // apresentação 04: a mochila virou tela própria (ui/bag/bag-panel.tsx); aqui é a bancada
  const tabs = [
    { id: "forge" as const, label: t("gearTabForge", "Forja") },
    { id: "refine" as const, label: t("refineTab", "Refinar") },
    { id: "guide" as const, label: t("forgeGuideTab", "Catálogo") },
    // E8: Índice de fragmentos
    { id: "fragments" as const, label: t("fragIndexTab", "Fragmentos") },
    // E11: desmontar e transmutar
    { id: "salvage" as const, label: t("salvageTab", "Desmontar") },
    // E13: runas (engastar e fundir)
    { id: "runes" as const, label: t("runeTab", "Runas") },
  ]
  const categoryNames: Record<Category, string> = {
    all: t("forgeAll", "Todos"), weapon: t("forgeWeapons", "Armas"), shield: t("forgeShields", "Escudos"), armor: t("forgeArmor", "Proteções"),
    accessory: t("forgeAccessories", "Acessórios"), material: t("forgeMaterials", "Materiais e peças"),
    recipe: t("forgeRecipes", "Projetos"), quest: t("forgeQuestItems", "Missão"), cosmetic: t("forgeCosmetics", "Cosméticos"),
    // trilha E1: categorias novas (o filtro só mostra as que têm item no catálogo)
    offhand: t("forgeOffhands", "Mão secundária"), relic: t("forgeRelics", "Relíquias"), fragment: t("forgeFragments", "Fragmentos"),
    rune: t("forgeRunes", "Runas"), consumable: t("forgeConsumables", "Consumíveis"), currency: t("forgeCurrency", "Fichas"),
  }
  const presentCategories = new Set<string>((catalog?.items || []).map(item => item.category))
  const changeTab = (next: GearTab) => { setTab(next); setConfirm(null); setMessage(null); setCategory("all") }
  // E6: o slot vem do catálogo (um só por peça)
  const slotsFor = (item: GearItem): GearSlot[] => (item.slot ? [item.slot] : [])
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
    // E9: a bancada é por CÓPIA (cada uma tem o seu +N); vestidas primeiro
    if (tab === "refine") items = (bag.instances || []).filter(inst => bag.forge?.[inst.id] && byId.has(inst.item))
      .sort((a, b) => Number(b.equippedHere) - Number(a.equippedHere) || b.plus - a.plus)
      .map(inst => ({
        key: inst.id, label: nameOf(byId.get(inst.item)!, t), render: () => <RefinementCard item={byId.get(inst.item)!} inst={inst} bag={bag} byId={byId} t={t} busy={!!busy} act={act} />,
      }))
    // E11: cópias soltas primeiro (as vestidas aparecem, mas não desmontam)
    if (tab === "salvage" && salvageMode === "salvage") items = (bag.instances || []).filter(inst => bag.forge?.[inst.id]?.salvage && byId.has(inst.item))
      .sort((a, b) => Number(!!a.equippedBy) - Number(!!b.equippedBy) || Number(a.locked) - Number(b.locked) || a.plus - b.plus)
      .map(inst => ({
        key: inst.id, label: nameOf(byId.get(inst.item)!, t),
        render: () => <SalvageCard item={byId.get(inst.item)!} inst={inst} bag={bag} byId={byId} t={t} busy={!!busy} act={act} confirmTier={catalog.salvage?.confirmTier ?? 3} />,
      }))
    // E13: só as cópias com engaste (as vestidas primeiro)
    if (tab === "runes" && runeMode === "socket") items = (bag.instances || []).filter(inst => (inst.socketsMax || 0) > 0 && byId.has(inst.item))
      .sort((a, b) => Number(b.equippedHere) - Number(a.equippedHere) || (b.socketsMax || 0) - (a.socketsMax || 0))
      .map(inst => ({
        key: inst.id, label: nameOf(byId.get(inst.item)!, t),
        render: () => <RuneSocketCard item={byId.get(inst.item)!} inst={inst} bag={bag} byId={byId} values={catalog.runes} t={t} busy={!!busy} act={act} />,
      }))
  }
  return (
    <AetherModal title={title} eyebrow={bag ? t("gearHeader", "Nível {lv} · {c} moedas").replace("{lv}", String(bag.level)).replace("{c}", String(bag.coins)) : undefined} onClose={onClose} width={680}>
      <AetherTabs label={t("gearTitle", "Equipamento")} tabs={tabs} value={tab} onChange={changeTab} />
      {tab === "forge" && <AetherTabs<ForgeKind> label={t("forgeKinds", "Bancadas da forja")} value={kind} onChange={setKind} tabs={[
        { id: "assembly", label: t("forgeWeapons", "Armas") }, { id: "part", label: t("forgeParts", "Peças") },
        { id: "equipment", label: t("forgeArmor", "Proteções") }, { id: "conversion", label: t("forgeConversions", "Conversões") },
        { id: "fragment", label: t("forgeByFragment", "Por fragmento") },
        // E16: consumíveis de preparo
        { id: "prep", label: t("forgePrep", "Preparos") },
      ]} />}
      {tab === "salvage" && <AetherTabs<"salvage" | "transmute"> label={t("salvageTab", "Desmontar")} value={salvageMode} onChange={setSalvageMode} tabs={[
        { id: "salvage", label: t("salvageTab", "Desmontar") }, { id: "transmute", label: t("transmuteTab", "Transmutar") },
      ]} />}
      {tab === "runes" && <AetherTabs<"socket" | "fuse"> label={t("runeTab", "Runas")} value={runeMode} onChange={setRuneMode} tabs={[
        { id: "socket", label: t("runeSocketTab", "Engastar") }, { id: "fuse", label: t("runeFuseTab", "Fundir") },
      ]} />}
      {(tab === "bag" || tab === "guide") && <label className="mb-3 flex min-h-11 items-center gap-3 text-[13px]" style={{ color: AE.text }}>
        {t("forgeCategory", "Categoria")}
        <select value={category} onChange={event => setCategory(event.target.value as Category)} className="min-h-11 min-w-0 flex-1 px-2" style={{ color: AE.text, background: AE.well, border: "1px solid " + AE.brassLine }}>
          {Object.entries(categoryNames).filter(([id]) => id === "all" || presentCategories.has(id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>}
      {tab === "fragments" && catalog && bag ? <FragmentIndex items={catalog.items} byId={byId} bag={bag} t={t} busy={!!busy} act={act} />
        : tab === "salvage" && salvageMode === "transmute" && catalog && bag ? <TransmutePanel catalog={catalog} bag={bag} t={t} busy={!!busy} act={act} />
        : tab === "runes" && runeMode === "fuse" && catalog && bag ? <RuneFusePanel catalog={catalog} bag={bag} byId={byId} t={t} busy={!!busy} act={act} />
        : !catalog || !bag ? <div className="grid min-h-48 place-items-center" style={{ color: AE.muted }}>{error ? <AetherButton onClick={() => void load()}>{t("forgeReload", "Tentar abrir novamente")}</AetherButton> : <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />}</div> : (
        <AetherCarousel key={tab + "-" + category + "-" + kind + "-" + salvageMode + "-" + runeMode} title={title} items={items} cardWidth={360} cardHeight={510} empty={tab === "bag" ? t("gearBagEmpty", "Mochila vazia. Lute e jogue para ganhar materiais.") : tab === "runes" ? t("runeNoPiece", "Nenhuma peça com engaste. Raras ou acima têm engaste.") : t("gearNothing", "Nada por aqui ainda.")} />
      )}
      {message && <p role="status" className="mt-3 text-center text-[13px]" style={{ color: AE.goldSoft }}>{message}</p>}
    </AetherModal>
  )
}
