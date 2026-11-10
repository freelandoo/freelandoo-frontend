// features/meu-mundo/buildings.ts — lore v2 F6: prédios por nível do TREINADOR.
//
// ESPELHO de freelandoo-backend/src/utils/meuMundoBuildings.js (o unit
// meuMundoBuildings do back confere linha a linha). Quem recusa é o SERVIDOR;
// aqui só se desenha o cadeado ("abre no nível N do treinador").
// 1ª sessão: Laboratório, casa, mercado e comida, academia (decisão do Alex);
// minijogos um a cada 2 níveis, o Paint por último (Gincana 3, Jetpack 5,
// Corrida 7, Rolê 9, Boxe 11, Paint 13); nível 10: Hall (Arena das Lâminas), Laboratório completo
// e mercado de personagens; o resto (meta longa) no nível 8, o do capítulo 4.

export const BUILDING_LEVELS: Record<string, number> = {
  criolab: 1,
  supermercado: 1,
  pizzaria: 1,
  hamburgueria: 1,
  academia: 1,
  hospital: 1,
  delegacia: 1,
  gincana: 3,
  jetpack: 5,
  corrida: 7,
  noturno: 9,
  boxe: 11,
  paint: 13,
  universidade: 8,
  escola: 8,
  biblioteca: 8,
  forja: 8,
  arsenal: 8,
  igreja: 8,
  laminas: 10,
}

/** Partes de um prédio que abrem depois dele. */
export const FEATURE_LEVELS: Record<"lab_full" | "char_market", number> = {
  lab_full: 10,
  char_market: 10,
}

/** Nunca fecham (casa, comida, Laboratório, hospital, delegacia). */
export const ALWAYS_OPEN = ["criolab", "supermercado", "pizzaria", "hamburgueria", "hospital", "delegacia"]

export const minLevelOf = (id: string): number => (ALWAYS_OPEN.includes(id) ? 1 : (BUILDING_LEVELS[id] ?? 1))

/** O que o servidor manda (GET /buildings): o nível, se passa direto e as missões de prédio. */
export interface BuildingMission {
  id: string
  place: string
  minLevel: number
  check: string
  xp: number
  state: "locked" | "current" | "done"
  ready: boolean
}
export interface BuildingsState {
  trainer: number
  bypass: boolean
  levels: Record<string, number>
  features: Record<string, number>
  missions: BuildingMission[]
}

/** Nível que falta para o prédio (null = aberto). */
export function lockOf(id: string, st: Pick<BuildingsState, "trainer" | "bypass"> | null): number | null {
  if (!st || st.bypass) return null
  const need = minLevelOf(id)
  return st.trainer >= need ? null : need
}

export function featureLockOf(f: keyof typeof FEATURE_LEVELS, st: Pick<BuildingsState, "trainer" | "bypass"> | null): number | null {
  if (!st || st.bypass) return null
  const need = FEATURE_LEVELS[f]
  return st.trainer >= need ? null : need
}
