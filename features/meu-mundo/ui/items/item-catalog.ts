// features/meu-mundo/ui/items/item-catalog.ts — como um BEM do jogo aparece
// (mm3d-30): nome, miniatura e categoria do slot. Puro, sem React.
//
// Os bens vêm das fontes reais (GET /inventory): geladeira (catálogo da vida,
// meuMundoLife.js ITEMS), veículos e casa da residência. Categoria sem nenhum
// bem não aparece. Personagem não é item: cada um é um ser com certidão própria
// (STATUS → Personagens); não existe vestuário.

import type { FridgeStock, InventoryResult, LifeItem, MailGift, VehicleKind } from "../../types"
import { thumbOf } from "../fridge/fridge-logic"
import { faceOf } from "../portraits"
import { speciesName } from "../../characters/names"
import type { BodyId } from "../../types"
import { LEGACY_SPECIES, speciesBody } from "../../characters/rules"

type Tr = (key: string, fallback: string) => string

export type ItemGroup = "food" | "health" | "vehicles" | "home"

export const GROUP_LABEL: Record<ItemGroup, [string, string]> = {
  food: ["itGroupFood", "Alimentos"],
  health: ["itGroupHealth", "Saúde e energia"],
  vehicles: ["itGroupVehicles", "Veículos"],
  home: ["itGroupHome", "Casa"],
}

export const VEHICLE_LABEL: Record<VehicleKind, [string, string]> = {
  car: ["itCar", "Carro"],
  bike: ["itBike", "Bicicleta"],
  skate: ["itSkate", "Skate"],
  skates: ["itSkates", "Patins"],
}

/** Um slot da vitrine. */
export interface Slot {
  key: string
  group: ItemGroup
  /** quantidade (só empilháveis) */
  qty: number | null
  thumb: string | null
  /** chegou de presente há pouco */
  fresh: boolean
  item?: LifeItem
  vehicle?: InventoryResult["inventory"]["vehicles"][number]
  house?: NonNullable<InventoryResult["inventory"]["house"]>
}

const groupOfItem = (it: LifeItem): ItemGroup => (it.kind === "food" || it.kind === "drink" ? "food" : "health")

/** Os slots, na ordem da vitrine. Só o que a pessoa TEM. */
export function buildSlots(inv: InventoryResult["inventory"], items: LifeItem[], fridge: FridgeStock): Slot[] {
  const fresh = new Set(inv.recentGifts.map((g) => `${g.gift.type}:${g.gift.id}`))
  const out: Slot[] = []
  const owned = items.filter((it) => (fridge[it.id] ?? 0) > 0)
  for (const g of ["food", "health"] as const) {
    for (const it of owned.filter((x) => groupOfItem(x) === g).sort((a, b) => (fridge[b.id] ?? 0) - (fridge[a.id] ?? 0))) {
      out.push({ key: `item:${it.id}`, group: g, qty: fridge[it.id] ?? 0, thumb: thumbOf(it.id), fresh: fresh.has(`item:${it.id}`), item: it })
    }
  }
  for (const v of inv.vehicles) out.push({ key: `vehicle:${v.kind}`, group: "vehicles", qty: null, thumb: null, fresh: false, vehicle: v })
  if (inv.house) out.push({ key: "house", group: "home", qty: null, thumb: null, fresh: false, house: inv.house })
  return out
}

/** Grupos que têm pelo menos um slot (sem categoria vazia). */
export const groupsOf = (slots: Slot[]): ItemGroup[] => (["food", "health", "vehicles", "home"] as const).filter((g) => slots.some((s) => s.group === g))

export function slotName(s: Slot, t: Tr): string {
  if (s.item) return t(`item_${s.item.id}`, s.item.name)
  if (s.vehicle) return t(VEHICLE_LABEL[s.vehicle.kind][0], VEHICLE_LABEL[s.vehicle.kind][1])
  if (s.house) return t("itHouse", "Casa nível {n}").replace("{n}", String(s.house.level))
  return ""
}

/** Nome de um presente (sem o catálogo carregado: o dicionário tem item_<id>). */
export function giftLabel(g: MailGift, t: Tr): string {
  if (g.type === "coins") return t("itCoinsGift", "{n} moedas do jogo").replace("{n}", String(g.qty))
  // personagem novo (vai para a cápsula); carta antiga traz o id de antes, que vira a espécie
  if (g.type === "skin" || g.type === "character")
    return t("itCharacterGift", "Personagem: {name}").replace("{name}", speciesName(g.type === "skin" ? (LEGACY_SPECIES[g.id]?.species ?? g.id) : g.id, t))
  const name = t(`item_${g.id}`, g.id)
  return g.qty > 1 ? `${name} × ${g.qty}` : name
}

export function giftThumb(g: MailGift): string | null {
  if (g.type === "item") return thumbOf(g.id)
  if (g.type === "skin" || g.type === "character") {
    const legacy = g.type === "skin" ? LEGACY_SPECIES[g.id] : null
    return faceOf((speciesBody(legacy?.species ?? g.id, legacy?.sex ?? null, "young") ?? "sergio") as BodyId)
  }
  return null
}
