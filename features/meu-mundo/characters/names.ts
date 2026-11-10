// features/meu-mundo/characters/names.ts — B3: nome visível de cada espécie.
// Deuses e especiais têm nome próprio (não se traduz, como em gods.ts); as classes e o
// Brutamontes passam pelo dicionário (mesmas chaves que o jogo já usa).

import { TALL_NAMES, isTall } from "../gods"

type Tr = (key: string, fallback: string) => string

export function speciesName(species: string | null | undefined, t: Tr): string {
  if (!species) return t("chNoSpecies", "Sem espécie")
  if (species === "raposa") return t("clanFox", "Raposa")
  if (species === "vampiro") return t("clanVampire", "Vampiro")
  if (species === "brutamontes") return t("laminasMobBrute", "Brutamontes")
  if (species === "sergio") return "Sergio"
  if (species === "ekaterina") return "Ekaterina"
  if (isTall(species)) return TALL_NAMES[species]
  return species
}
