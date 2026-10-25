// features/meu-mundo/ui/fridge/fridge-logic.ts — o que a geladeira MOSTRA (mm3d-28).
//
// Puro (sem React): categorias a partir do catálogo real da vida
// (meuMundoLife.js ITEMS, que vem no "open" da sala), o verbo do botão, os
// efeitos previstos e se o item atende à refeição pendente. Quem decide é o
// servidor (crédito de refeição, janela, penalidade); aqui só se lê o que ele
// mandou para a pessoa saber antes de confirmar.

import type { FridgeStock, LifeCharacter, LifeItem } from "../../types"

export type FridgeCategory = "meals" | "snacks" | "drinks" | "supplements" | "medicine" | "stimulants" | "anabolic"

/** Ordem do carrossel; a categoria sem item no catálogo não aparece. */
export const CATEGORY_ORDER: FridgeCategory[] = ["meals", "snacks", "drinks", "supplements", "medicine", "stimulants", "anabolic"]

/** Prato que quita (crédito ≥ 0,7) é refeição; o resto da comida é lanche. */
export function categoryOf(it: LifeItem): FridgeCategory {
  if (it.kind === "food") return (it.meal ?? 0) >= 0.7 ? "meals" : "snacks"
  if (it.kind === "drink") return "drinks"
  if (it.kind === "supplement") return "supplements"
  if (it.kind === "medicine") return "medicine"
  if (it.kind === "stimulant") return "stimulants"
  return "anabolic"
}

export const thumbOf = (id: string) => `/meu-mundo/geladeira/v1/${id}.webp`

export interface CategoryCard {
  id: FridgeCategory
  items: LifeItem[]
  /** unidades na geladeira, somando os itens da categoria */
  qty: number
  /** imagem da capa: o item com mais unidades (ou o primeiro) */
  cover: string
}

export function categories(items: LifeItem[], stock: FridgeStock): CategoryCard[] {
  const out: CategoryCard[] = []
  for (const id of CATEGORY_ORDER) {
    const list = items.filter((it) => categoryOf(it) === id)
    if (!list.length) continue
    // Com estoque primeiro (mais unidades na frente), depois o resto na ordem do catálogo.
    list.sort((a, b) => (stock[b.id] ?? 0) - (stock[a.id] ?? 0))
    out.push({ id, items: list, qty: list.reduce((n, it) => n + (stock[it.id] ?? 0), 0), cover: thumbOf(list[0].id) })
  }
  return out
}

const LIQUIDS = new Set(["agua_coco", "refrigerante", "cafe", "energetico", "whey", "pre_treino"])

/** O verbo do botão de confirmar. */
export function verbOf(it: LifeItem): "eat" | "drink" | "take" {
  if (it.kind === "drink" || LIQUIDS.has(it.id)) return "drink"
  if (it.kind === "food") return "eat"
  return "take"
}

export type EffectKey = "satiety" | "energy" | "mood" | "stress" | "good" | "bad" | "toxic" | "lasts"

export interface Effect {
  key: EffectKey
  /** valor com sinal (pontos) ou horas, conforme a chave */
  value?: number
  tone: "good" | "bad" | "neutral"
}

/** Efeitos previstos de uma unidade, o principal (saciedade) primeiro. */
export function effectsOf(it: LifeItem): Effect[] {
  const out: Effect[] = []
  if (it.sat) out.push({ key: "satiety", value: it.sat, tone: "good" })
  if (it.energy) out.push({ key: "energy", value: it.energy, tone: it.energy > 0 ? "good" : "bad" })
  if (it.mood) out.push({ key: "mood", value: it.mood, tone: "good" })
  if (it.stress) out.push({ key: "stress", value: it.stress, tone: it.stress < 0 ? "good" : "bad" })
  if (it.nutri >= 4) out.push({ key: "good", tone: "good" })
  else if (it.nutri <= -4) out.push({ key: "bad", tone: "bad" })
  if (it.tox) out.push({ key: "toxic", tone: "bad" })
  if (it.effect) out.push({ key: "lasts", value: it.effect.hours, tone: "neutral" })
  return out
}

export type MealFit =
  | { kind: "full"; at: number; late: boolean }
  | { kind: "part"; at: number; pct: number; late: boolean }
  | { kind: "none" }
  | { kind: "noMeal" }

/**
 * Atende à refeição pendente? Lê `pendingMeal` do snapshot (a mais antiga
 * aberta, parcial ou atrasada) e o crédito do item. Bebida sem crédito não
 * quita nada; a sobra não passa para a próxima (regra do servidor).
 */
export function mealFit(it: LifeItem, c: LifeCharacter | null | undefined): MealFit {
  const credit = it.meal ?? 0
  if (credit <= 0) return { kind: "none" }
  const m = c?.pendingMeal
  if (!m || !(m.state === "open" || m.state === "partial" || m.state === "late")) return { kind: "noMeal" }
  const late = m.state === "late"
  const have = m.credit ?? 0
  if (have + credit >= 1 - 1e-9) return { kind: "full", at: m.at, late }
  return { kind: "part", at: m.at, pct: Math.round((have + credit) * 100), late }
}

/** Chave de pedido (8–64, [A-Za-z0-9_-]) — a mesma em todas as tentativas do mesmo prato. */
export function newEatKey(): string {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID().replace(/-/g, "")
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`
}
