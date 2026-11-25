// features/meu-mundo/gods.ts — os deuses de Lúmen (mm3d-50).
//
// Lore v2: MEU MUNDO 3D/historia/v2/. Cada um é um PERSONAGEM
// (pipeline/build_deuses.py) que usa todas as animações do Sergio, e uma
// estátua de pedra nas praças (pipeline/build_estatuas.py). O corpo e o personagem
// têm o mesmo id; o backend espelha a lista em src/utils/meuMundoCharacters.js (LEGACY_SPECIES) e
// no CHECK chk_mm_avatar_body (mig 313).

// Lore v2 (F1, 2026-11-10; MEU MUNDO 3D/historia/v2/00-classificacao.md): DEUSES são só os 8.
// Ciborgue, Cavaleiro Dourado, Golem de Pedra e Dama das Garras são MONSTROS (eram Raposas,
// mutadas pela Cinza). Os 12 continuam sendo corpos "altos" feitos pela mesma receita
// (build_deuses.py, arquivos avatar-<id>.glb e retratos deus-<id>.webp): para arquivo, rig e
// retrato vale TALL_BODIES; para o que é história (quem é deus) vale GOD_BODIES.
// 22/11: + VARKOS, o Leão da Guerra (lado de Aurion; lore em arte/historias/pagina/lore.html). Tripo do
// Alex, pipeline/npcs + build_deuses.py (3,20 m, todas as animações do Sergio). Deus jogável.
export const GOD_BODIES = ["aurion", "morkhan", "kragor", "zephyra", "maru", "iris", "noctis", "aeryn", "varkos"] as const
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
  varkos: "Varkos",
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

// 25/11 (Alex: "não tem skin — todos ficam adultos, assim como a raposa e o vampiro"): o corpo
// JOVEM dos 9 deuses e dos dois monstros que eram Raposas. Até a virada (GROWTH) o servidor manda
// `<espécie>_jovem` (characters/rules.ts speciesBody); luta, arma, golpes e nome são os do adulto
// (adultBody). Arquivos avatar-<id>.glb pela receita dos deuses (pipeline/npcs YOUNG).
export const YOUNG_BODIES = [
  "aurion_jovem", "morkhan_jovem", "kragor_jovem", "zephyra_jovem", "maru_jovem", "iris_jovem", "noctis_jovem", "aeryn_jovem", "varkos_jovem",
  "ciborgue_jovem", "garras_jovem",
] as const
export type YoungBody = (typeof YOUNG_BODIES)[number]
/** O adulto de cada jovem (a mesma regra de adultBody, tipada). */
export const ADULT_OF: Record<YoungBody, TallBody> = {
  aurion_jovem: "aurion", morkhan_jovem: "morkhan", kragor_jovem: "kragor", zephyra_jovem: "zephyra", maru_jovem: "maru", iris_jovem: "iris",
  noctis_jovem: "noctis", aeryn_jovem: "aeryn", varkos_jovem: "varkos", ciborgue_jovem: "ciborgue", garras_jovem: "garras",
}
export const isYoungBody = (id: string | null | undefined): id is YoungBody => (YOUNG_BODIES as readonly string[]).includes(id ?? "")
/** Mapa por corpo jovem a partir de uma função (para os Record<BodyId, …>). */
export const byYoung = <T>(f: (b: YoungBody) => T) => Object.fromEntries(YOUNG_BODIES.map((b) => [b, f(b)])) as Record<YoungBody, T>
/** Mapa por corpo jovem copiando o valor do adulto de um mapa por corpo alto. */
export const youngLike = <T>(byAdult: Record<TallBody, T>) => byYoung((b) => byAdult[ADULT_OF[b]])
