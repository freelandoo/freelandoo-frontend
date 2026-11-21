// features/meu-mundo/paint/engine/arenas/index.ts — PAINT (2026-11-21): quem desenha o que é de cada mapa dos Domínios.
// O resto dos mapas segue no `arena-view.ts` como antes.

import type { ArenaDress } from "./types"
import { CANION_DRESS } from "./canion"
import { GELO_DRESS } from "./gelo"
import { ORBITAL_DRESS } from "./orbital"
import { LUA_DRESS } from "./lua"
import { USINA_DRESS } from "./usina"

export const ARENA_DRESS: Record<string, ArenaDress | undefined> = {
  canion: CANION_DRESS,
  gelo: GELO_DRESS,
  orbital: ORBITAL_DRESS,
  lua: LUA_DRESS,
  usina: USINA_DRESS,
}
