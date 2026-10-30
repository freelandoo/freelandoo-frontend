// features/meu-mundo/gods.ts — os deuses de Lúmen (mm3d-50).
//
// Os Sete campeões dos Jogos Eternos e Morkhan, o Sem-Nome (lore em MEU MUNDO
// 3D/planos/2026-10-28-mm3d-48-as-sete-chamas.md). Cada um é uma SKIN de 2 m
// (pipeline/build_deuses.py) que usa todas as animações do Sergio, e uma
// estátua de pedra nas praças (pipeline/build_estatuas.py). O corpo e a skin
// têm o mesmo id; o backend espelha a lista em src/utils/meuMundoSkins.js e
// no CHECK chk_mm_avatar_body (mig 313).

export const GOD_BODIES = ["aurion", "morkhan", "kragor", "zephyra", "maru", "iris", "noctis", "aeryn"] as const
export type GodBody = (typeof GOD_BODIES)[number]

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

export const isGod = (id: string | null | undefined): id is GodBody => (GOD_BODIES as readonly string[]).includes(id ?? "")

/** Mapa por deus a partir de uma função (para os Record<BodyId, …> dos outros arquivos). */
export const byGod = <T>(f: (g: GodBody) => T) => Object.fromEntries(GOD_BODIES.map((g) => [g, f(g)])) as Record<GodBody, T>
