// features/meu-mundo/laminas/abilities/families.ts — a família do golpe de cada skin (lv2-B1, 2026-11-11).
//
// Corte, Investida e Escudo são a MESMA regra para todo mundo (sim/fight.ts). A família só
// muda o desenho: lâmina corta com a lua, maga solta um selo girando, martelo rola uma onda
// pesada com lascas, arco dispara uma flecha de luz reta, arma de fogo um traçante reto,
// garras rasgam em três, pedra arremessa as pedras do Golem com o raio entre elas.
//
// Regra do Alex: golpe vem da SKIN, nunca da arma (a arma muda modelo, rastro e bônus).
// Sem Babylon de propósito.

export type StrikeStyle = "blade" | "mage" | "hammer" | "bow" | "gun" | "claws" | "stone"

export const STRIKE_STYLES: readonly StrikeStyle[] = ["blade", "mage", "hammer", "bow", "gun", "claws", "stone"]

/** O que a luta já sabe da skin (os mesmos sinais que escolhem os golpes do corpo). */
export interface StyleFlags {
  ring: boolean
  claws: boolean
  bow: boolean
  gun: boolean
  /** Golpes pesados (Brutamontes, Golem, Marú, Kragor). */
  brute: boolean
  mage: boolean
  body: string
}

/** No ringue todo mundo é boxeador: fica o desenho de sempre (lâmina). */
export function strikeStyle(f: StyleFlags): StrikeStyle {
  if (f.ring) return "blade"
  if (f.claws) return "claws"
  if (f.brute && f.body === "golem") return "stone"
  if (f.bow) return "bow"
  if (f.gun) return "gun"
  if (f.brute) return "hammer"
  if (f.mage) return "mage"
  return "blade"
}
