"use client"

// features/meu-mundo/ui/bag/bag-panel.tsx — a MOCHILA ÚNICA (apresentação 04, Anexo A §7.2).
//
// Antes eram duas telas: Itens (comida, vestuário, veículos, casa — GET /inventory) e
// Equipamento (armas, proteções, materiais — GET /gear). Agora uma tela só:
//   barra de cima (voltar · casa · "Mochila" · Esmeraldas + Gold com "+")
//   fita de categorias em cima (Armas · Proteção · Materiais · Comida e tônicos · Roupas e casa)
//   grade de 5 colunas de casas quadradas; casa vazia aparece apagada (a grade não muda de forma);
//   a raridade é a cor da FAIXA de baixo da casa; quantidade embaixo à direita; "E" = equipado
//   tocar seleciona e abre o detalhe: folha que sobe de baixo no celular, coluna à direita no PC,
//   com o botão principal embaixo (Equipar/Tirar, Usar…) e "onde conseguir".
// Forja e refino moram na Loja; aqui só o atalho de um refino pendente.
// As regras são as mesmas de antes (equipGear/applyGearItem/recycleGear; comer é na despensa).

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { Loader2, PackageOpen, RefreshCw } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { applyGearItem, equipGear, getInventory, getWallets, recycleGear, type GearItem, type GearSlot, type Receipt } from "../../data"
import type { InventoryResult } from "../../types"
import { TopBar } from "../kit/top-bar"
import { AE, RARITY, chamfer } from "../kit/aether-tokens"
import { AetherButton } from "../kit/aether-modal"
import { ItemImage, type ItemCategory } from "../kit/item-image"
import { TX } from "../kit/type-scale"
import { GearItemCard, bonusLines, gearLock, gearThumb, nameOf, type GearTr } from "../gear/gear-card"
import { useWorkshop } from "../gear/use-workshop"
import { SlotDetail, SlotThumb } from "../items/items-panel"
import { buildSlots, slotName, type Slot } from "../items/item-catalog"

type Tab = "weapons" | "armor" | "materials" | "food" | "things"
const TABS: [Tab, string, string][] = [
  ["weapons", "bagTabWeapons", "Armas"],
  ["armor", "bagTabArmor", "Proteção"],
  ["materials", "bagTabMaterials", "Materiais"],
  ["food", "bagTabFood", "Comida e tônicos"],
  ["things", "bagTabThings", "Roupas e casa"],
]
/** Casas por linha e o mínimo de casas na grade (as vazias completam). */
const COLS = 5
const MIN_CELLS = 20

interface Cell {
  key: string
  name: string
  qty: number | null
  rarity: keyof typeof RARITY | null
  equipped: boolean
  fresh: boolean
  gear?: GearItem
  slot?: Slot
}

const tabOfGear = (g: GearItem): Tab => (g.category === "weapon" ? "weapons" : g.category === "shield" || g.category === "armor" || g.category === "accessory" ? "armor" : "materials")
const slotsFor = (item: GearItem): GearSlot[] =>
  item.category === "weapon" ? ["weapon"] : item.category === "shield" ? ["shield"] : item.category === "armor" ? ["armor"] : item.category === "accessory" ? ["acc1", "acc2"] : []

export default function BagPanel({
  onClose,
  onOpenShop,
  onOpenPolens,
  onOpenRefine,
  onChanged,
  onReceipt,
}: {
  onClose: () => void
  /** "+" das Esmeraldas: a Loja. */
  onOpenShop: () => void
  /** "+" do Gold. */
  onOpenPolens?: () => void
  /** Refino pendente: a bancada (mora na Loja). */
  onOpenRefine: () => void
  onChanged?: () => void
  onReceipt?: (r: Receipt) => void
}) {
  const t = useTranslations("MeuMundo") as GearTr
  const { catalog, bag, busy, message, error, load, act } = useWorkshop(t, onReceipt)
  const [inv, setInv] = useState<InventoryResult | null>(null)
  const [invError, setInvError] = useState(false)
  const [gold, setGold] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>("weapons")
  const [pick, setPick] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const loadInv = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setInvError(false)
    const r = await getInventory(token)
    if (r.ok) setInv(r.data)
    else setInvError(true)
    const w = await getWallets(token)
    if (w.ok) setGold(w.data.wallet.polens)
  }, [])
  useEffect(() => {
    void loadInv()
  }, [loadInv])
  // ESC fecha (o detalhe aberto fecha primeiro)
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (pick) setPick(null)
      else onClose()
    }
    window.addEventListener("keydown", key)
    return () => window.removeEventListener("keydown", key)
  }, [pick, onClose])

  const slots = useMemo(() => (inv ? buildSlots(inv.inventory, inv.items, inv.fridge ?? {}) : []), [inv])
  const cells = useMemo(() => {
    const out: Record<Tab, Cell[]> = { weapons: [], armor: [], materials: [], food: [], things: [] }
    if (catalog && bag) {
      const equipped = new Set(Object.values(bag.equipped))
      for (const g of catalog.items) {
        const own = bag.owned[g.id]
        if (!own) continue
        out[tabOfGear(g)].push({ key: "g:" + g.id, name: nameOf(g, t), qty: g.stack ? own.qty : null, rarity: g.rarity, equipped: equipped.has(g.id), fresh: false, gear: g })
      }
    }
    for (const s of slots) {
      const tb: Tab = s.group === "food" || s.group === "health" ? "food" : "things"
      out[tb].push({ key: "s:" + s.key, name: slotName(s, t), qty: s.qty, rarity: null, equipped: !!s.skin?.equipped, fresh: s.fresh, slot: s })
    }
    return out
  }, [catalog, bag, slots, t])

  const list = cells[tab]
  const filled = Math.max(MIN_CELLS, Math.ceil(list.length / COLS) * COLS)
  const selected = list.find((c) => c.key === pick) ?? null
  const loading = (tab === "food" || tab === "things" ? !inv && !invError : !catalog || !bag) && !error
  const failed = tab === "food" || tab === "things" ? invError : error && !catalog

  const changeTab = (next: Tab) => {
    setTab(next)
    setPick(null)
    setConfirm(null)
  }

  return (
    <div className="fixed inset-0 z-[78] flex items-stretch justify-center sm:items-center sm:p-6" style={{ background: "rgba(6,8,12,.55)" }} role="dialog" aria-modal aria-labelledby="mm-bag-title" data-mm-panel="">
      <div
        className="relative flex h-full w-full flex-col overflow-hidden sm:h-[min(86vh,760px)] sm:max-w-[960px]"
        style={{ background: AE.iron, boxShadow: `inset 0 0 0 1px ${AE.brassLine}, ${AE.hard}` }}
      >
        <TopBar
          title={t("bagTitle", "Mochila")}
          onBack={onClose}
          onHome={onClose}
          coins={[
            { id: "coins", value: bag?.coins ?? inv?.wallet.coins ?? null, onAdd: onOpenShop },
            { id: "polens", value: gold, onAdd: onOpenPolens },
          ]}
        />
        <span id="mm-bag-title" className="sr-only">
          {t("bagTitle", "Mochila")}
        </span>
        {/* fita de categorias (o "trilho" da referência, deitado em cima no celular em pé) */}
        <div className="flex shrink-0 gap-1 overflow-x-auto px-3 pt-3" role="tablist" aria-label={t("itGroups", "Categorias")}>
          {TABS.map(([id, key, fb]) => {
            const on = tab === id
            const n = cells[id].length
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => changeTab(id)}
                className={`${TX.body} flex min-h-11 shrink-0 items-center gap-1.5 px-3 font-bold uppercase tracking-[0.04em] transition-transform duration-100 active:scale-[0.97]`}
                style={{ background: on ? AE.goldPlate : AE.steel, color: on ? AE.ink : AE.muted, clipPath: chamfer(AE.cut.chip) }}
              >
                {t(key, fb)}
                {n > 0 && <span className={`${TX.label} tabular-nums`} style={{ opacity: on ? 0.75 : 0.6 }}>{n}</span>}
              </button>
            )
          })}
        </div>

        <div className="grid min-h-0 flex-1 sm:grid-cols-[minmax(0,1fr)_340px]">
          {/* a grade */}
          <div className="min-h-0 overflow-y-auto px-3 pb-4 pt-3">
            {failed ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center" style={{ color: AE.muted }} role="alert">
                {t("itLoadFail", "Não carregou seus itens.")}
                <AetherButton onClick={() => (tab === "food" || tab === "things" ? void loadInv() : void load())}>
                  <RefreshCw className="mr-1 inline h-4 w-4" />
                  {t("ibRetry", "Tentar de novo")}
                </AetherButton>
              </div>
            ) : loading ? (
              <div className="grid place-items-center py-16" style={{ color: AE.muted }}>
                <Loader2 className="h-6 w-6 animate-spin" aria-label={t("gearLoading", "Carregando…")} />
              </div>
            ) : (
              <>
                {list.length === 0 && (
                  <p className={`${TX.body} mb-3 flex items-center gap-2`} style={{ color: AE.muted }}>
                    <PackageOpen className="h-5 w-5 shrink-0" style={{ color: AE.goldSoft }} />
                    {tab === "food" ? t("bagEmptyFood", "Nada aqui. O Empório vende comida e tônicos.") : tab === "things" ? t("bagEmptyThings", "Nada aqui ainda.") : t("gearBagEmpty", "Mochila vazia. Lute e jogue para ganhar materiais.")}
                  </p>
                )}
                <ul className="grid gap-2" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }} aria-label={t("bagTitle", "Mochila")}>
                  {Array.from({ length: filled }, (_, i) => {
                    const c = list[i]
                    if (!c)
                      return (
                        <li key={"v" + i} className={`${TX.label} grid aspect-square place-items-center uppercase`} style={{ background: AE.well, color: AE.dim, opacity: 0.55, clipPath: chamfer(AE.cut.chip) }} aria-hidden>
                          {t("bagEmptyCell", "vazio")}
                        </li>
                      )
                    return (
                      <li key={c.key}>
                        <CellButton cell={c} active={pick === c.key} onClick={() => setPick(pick === c.key ? null : c.key)} />
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>

          {/* o detalhe: coluna no PC; no celular, folha que sobe de baixo */}
          <aside
            className={`min-h-0 overflow-y-auto border-t sm:static sm:block sm:border-l sm:border-t-0 ${selected ? "absolute inset-x-0 bottom-0 z-10 max-h-[72%]" : "hidden"}`}
            style={{ background: AE.steel, borderColor: AE.brassLine, boxShadow: selected ? "0 -4px 0 #000" : undefined }}
            aria-live="polite"
          >
            {selected ? (
              <Detail
                cell={selected}
                t={t}
                busy={!!busy}
                confirm={confirm}
                setConfirm={setConfirm}
                onClose={() => setPick(null)}
                onRefine={onOpenRefine}
                equip={(item, slot) => {
                  const target = slot || slotsFor(item).find((s) => !bag?.equipped[s]) || slotsFor(item)[0]
                  void act("equip-" + item.id, (tk) => equipGear(tk, target, slot ? null : item.id, slot ? null : bag?.owned[item.id]?.instance), t("gearEquippedOk", "Equipamento atualizado.")).then(() => onChanged?.())
                }}
                use={(item) => void act("use-" + item.id, (tk, key) => applyGearItem(tk, item.id, key), t("forgeUsed", "Uso registrado."))}
                recycle={(item) => {
                  void act("recycle-" + item.id, (tk, key) => recycleGear(tk, item.id, 1, key))
                  setConfirm(null)
                }}
                bag={bag}
              />
            ) : (
              <p className={`${TX.body} hidden p-4 sm:block`} style={{ color: AE.muted }}>
                {t("bagPickHint", "Toque numa casa para ver o item.")}
              </p>
            )}
          </aside>
        </div>
        {message && (
          <p role="status" className={`${TX.body} shrink-0 px-3 pb-3 text-center`} style={{ color: AE.goldSoft }}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

/** Uma casa da grade: arte, quantidade, "E" de equipado, "novo" e a faixa da raridade embaixo. */
function CellButton({ cell, active, onClick }: { cell: Cell; active: boolean; onClick: () => void }) {
  const t = useTranslations("MeuMundo")
  const rc = cell.rarity ? RARITY[cell.rarity].color : AE.brassLine
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={cell.name}
      title={cell.name}
      className="relative block aspect-square w-full overflow-hidden transition-transform duration-100 active:scale-[0.95]"
      style={{ background: AE.well, clipPath: chamfer(AE.cut.chip), boxShadow: active ? `inset 0 0 0 2px ${AE.gold}` : `inset 0 0 0 1px ${AE.brassLine}` }}
    >
      <span className="absolute inset-0 grid place-items-center p-1">
        {cell.gear ? <GearThumb item={cell.gear} /> : cell.slot ? <SlotThumb slot={cell.slot} /> : null}
      </span>
      {/* faixa da raridade */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1" style={{ background: rc }} />
      {cell.qty != null && cell.qty > 1 && (
        <span className={`${TX.label} absolute bottom-1.5 right-1 font-bold tabular-nums`} style={{ color: AE.text, textShadow: "0 1px 0 #000, 0 0 3px #000" }}>
          {cell.qty}
        </span>
      )}
      {cell.equipped && (
        <span className={`${TX.label} absolute left-1 top-1 px-1 font-black leading-[14px]`} style={{ background: AE.gold, color: AE.ink }} title={t("bagEquipped", "Equipado")}>
          E
        </span>
      )}
      {cell.fresh && (
        <span className={`${TX.label} absolute right-1 top-1 px-1 font-bold uppercase leading-[14px]`} style={{ background: AE.coral, color: AE.ink }}>
          {t("bagNew", "novo")}
        </span>
      )}
    </button>
  )
}

function GearThumb({ item }: { item: GearItem }) {
  const src = gearThumb(item)
  if (src)
    // eslint-disable-next-line @next/next/no-img-element -- miniatura estática local, lista
    return <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain" />
  return <ItemImage category={(item.category === "shield" ? "armor" : item.category) as ItemCategory} rarity={item.rarity} alt="" ratio={1} />
}

function Detail({
  cell,
  t,
  busy,
  confirm,
  setConfirm,
  onClose,
  onRefine,
  equip,
  use,
  recycle,
  bag,
}: {
  cell: Cell
  t: GearTr
  busy: boolean
  confirm: string | null
  setConfirm: (v: string | null) => void
  onClose: () => void
  onRefine: () => void
  equip: (item: GearItem, slot: GearSlot | undefined) => void
  use: (item: GearItem) => void
  recycle: (item: GearItem) => void
  bag: ReturnType<typeof useWorkshop>["bag"]
}) {
  const close = (
    <button type="button" onClick={onClose} className={`${TX.body} absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center sm:hidden`} style={{ color: AE.muted }} aria-label={t("stCardClose", "Fechar")}>
      ✕
    </button>
  )
  if (cell.slot)
    return (
      <div className="relative p-3">
        {close}
        <SlotDetail slot={cell.slot} t={t} busy={busy} onEquip={() => {}} />
      </div>
    )
  const item = cell.gear!
  const own = bag?.owned[item.id]
  const slot = bag ? (Object.entries(bag.equipped).find(([, id]) => id === item.id)?.[0] as GearSlot | undefined) : undefined
  const lock = gearLock(item, bag ?? null, t)
  const pending = bag?.pendingProposals?.some((p) => p.item === item.id && p.status === "pending")
  const actions: ReactNode[] = []
  if (pending) actions.push(<AetherButton key="ref" disabled={busy} onClick={onRefine}>{t("refinePending", "Resolver refinamento pendente")}</AetherButton>)
  else if (own && slotsFor(item).length)
    actions.push(
      <AetherButton key="eq" disabled={!!lock || busy} onClick={() => equip(item, slot)}>
        {slot ? t("gearUnequip", "Tirar") : t("gearEquip", "Equipar")}
      </AetherButton>,
    )
  if (own && item.use && item.use !== "equip")
    actions.push(
      <AetherButton key="use" disabled={busy} onClick={() => use(item)}>
        {item.use === "learn_recipe" ? t("forgeLearn", "Aprender projeto") : item.use === "inspect_quest" ? t("forgeRead", "Examinar registro") : item.use === "unlock_emote" ? t("forgeUnlockEmote", "Desbloquear gesto") : t("forgeApplyCosmetic", "Aplicar visual")}
      </AetherButton>,
    )
  if (own && item.category === "material" && item.sell > 0)
    actions.push(
      confirm === "recycle-" + item.id ? (
        <div key="rc" className="grid gap-2">
          <p className={TX.label} style={{ color: AE.bad }}>
            {t("forgeRecycleConfirm", "Consumir 1 unidade por {n} moedas?").replace("{n}", String(item.sell))}
          </p>
          <AetherButton busy={busy} onClick={() => recycle(item)}>{t("gearConfirm", "Confirmar")}</AetherButton>
          <AetherButton tone="secondary" onClick={() => setConfirm(null)}>{t("gearCancel", "Voltar")}</AetherButton>
        </div>
      ) : (
        <AetherButton key="rc" tone="secondary" disabled={busy} onClick={() => setConfirm("recycle-" + item.id)}>
          {t("gearRecycleOne", "Reciclar 1")}
        </AetherButton>
      ),
    )
  return (
    <div className="relative">
      {close}
      <GearItemCard
        item={item}
        t={t}
        subtitle={own ? t("forgeOwnedCount", "Na mochila: {n}").replace("{n}", String(own.qty)) + (own.level ? " · +" + own.level : "") : undefined}
        lines={bonusLines(item.bonus, t)}
      >
        {lock && <p className={TX.label} style={{ color: AE.bad }}>{lock}</p>}
        {actions.length > 0 && <div className="mt-auto grid gap-2">{actions}</div>}
      </GearItemCard>
    </div>
  )
}
