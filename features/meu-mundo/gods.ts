// features/meu-mundo/gods.ts — os deuses de Lúmen (mm3d-50).
//
// Lore v2: MEU MUNDO 3D/historia/v2/. Cada um é uma SKIN
// (pipeline/build_deuses.py) que usa todas as animações do Sergio, e uma
// estátua de pedra nas praças (pipeline/build_estatuas.py). O corpo e a skin
// têm o mesmo id; o backend espelha a lista em src/utils/meuMundoCharacters.js (SKIN_SPECIES) e
// no CHECK chk_mm_avatar_body (mig 313).

// Lore v2 (F1, 2026-11-10; MEU MUNDO 3D/historia/v2/00-classificacao.md): DEUSES são só os 8.
// Ciborgue, Cavaleiro Dourado, Golem de Pedra e Dama das Garras são MONSTROS (eram Raposas,
// mutadas pela Cinza). Os 12 continuam sendo corpos "altos" feitos pela mesma receita
// (build_deuses.py, arquivos avatar-<id>.glb e retratos deus-<id>.webp): para arquivo, rig e
// retrato vale TALL_BODIES; para o que é história (quem é deus) vale GOD_BODIES.
export const GOD_BODIES = ["aurion", "morkhan", "kragor", "zephyra", "maru", "iris", "noctis", "aeryn"] as const
export type GodBody = (typeof GOD_BODIES)[number]
export const MONSTER_BODIES = ["ciborgue", "cavaleiro", "golem", "garras"] as const
export type MonsterBody = (typeof MONSTER_BODIES)[number]
/** Os corpos da receita dos deuses, na ordem de sempre (BODY_IDS depende dela). */
export const TALL_BODIES = [...GOD_BODIES, ...MONSTER_BODIES] as const
export type TallBody = GodBody | MonsterBody

/** Nome próprio (não se traduz). */
export const GOD_NAMES: Record<GodBody, string> = {
  aurion: "Aurion",
  morkhan: "Morkhan",
  kragor: "Kragor",
  zephyra: "Zéphyra",
  maru: "Marú",
  iris: "Íris",
  noctis: "Noctis",
  aeryn: "Aeryn",
}
export const MONSTER_NAMES: Record<MonsterBody, string> = {
  ciborgue: "Ciborgue",
  cavaleiro: "Cavaleiro Dourado",
  golem: "Golem de Pedra",
  garras: "Dama das Garras",
}
export const TALL_NAMES: Record<TallBody, string> = { ...GOD_NAMES, ...MONSTER_NAMES }

/** Deus de verdade (história). */
export const isGod = (id: string | null | undefined): id is GodBody => (GOD_BODIES as readonly string[]).includes(id ?? "")
/** Monstro que também é corpo jogável. */
export const isMonsterBody = (id: string | null | undefined): id is MonsterBody => (MONSTER_BODIES as readonly string[]).includes(id ?? "")
/** Corpo da receita dos deuses (arquivo, rig, retrato). */
export const isTall = (id: string | null | undefined): id is TallBody => (TALL_BODIES as readonly string[]).includes(id ?? "")

/** Mapa por corpo alto a partir de uma função (para os Record<BodyId, …> dos outros arquivos). */
export const byTall = <T>(f: (g: TallBody) => T) => Object.fromEntries(TALL_BODIES.map((g) => [g, f(g)])) as Record<TallBody, T>
