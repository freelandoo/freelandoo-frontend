// features/meu-mundo/laminas/abilities/registry.ts — quem é quem nas habilidades (2026-11-07).
//
// A REGRA é uma só para todo mundo: Corte Mágico, Investida, Escudo e Poder Máximo, em
// sim/fight.ts, re-simulados pelo servidor. Aqui fica só a APRESENTAÇÃO de cada personagem:
// família de efeitos, cor, nome e ícone. Nada daqui muda dano, recarga ou alcance.
//
// Sem Babylon de propósito: a tela (skill-hud) lê este arquivo.
//
// Personagem sem entrada própria cai na família "steel" e nos ícones da referência.
// Um poder só ganha `cinematic` depois de pronto e conferido (hoje: os quatro vampiros).

import type { SkillId } from "../sim/fight"

export type AbilitySlot = SkillId | "ult"

/** Família visual: decide o efeito do botão com o poder cheio (nunca o mesmo fogo em todos). */
export type FxFamily = "blood" | "ember" | "storm" | "stone" | "shadow" | "solar" | "tide" | "prism" | "gear" | "steel"

export interface SlotArt {
  /** Caminho a partir de /meu-mundo/laminas (sem extensão). */
  icon: string
  /** Nome próprio; sem = o nome geral da habilidade. */
  name?: { key: string; fallback: string }
}

export interface AbilityKit {
  family: FxFamily
  /** Cor do aro e do botão. */
  tone: string
  slots: Record<AbilitySlot, SlotArt>
  /** Sequência cinematográfica do Poder Máximo (id em abilities/); sem = o poder antigo. */
  cinematic?: "blood-cut"
}

const BASE: Record<AbilitySlot, SlotArt> = {
  slash: { icon: "skills/slash" },
  dash: { icon: "skills/dash" },
  shield: { icon: "skills/shield" },
  ult: { icon: "skills/ult" },
}

const kit = (family: FxFamily, tone: string, extra: Partial<AbilityKit> = {}): AbilityKit => ({ family, tone, slots: BASE, ...extra })

const VAMPIRE: AbilityKit = kit("blood", "#d3173f", {
  cinematic: "blood-cut",
  slots: { ...BASE, ult: { icon: "abilities/vampiro/ult", name: { key: "abilityBloodCut", fallback: "Golpe de Sangue" } } },
})
const FOX = kit("ember", "#ff8a2a")

/** Corpo → kit. A família segue a cor que o personagem já tem na luta (VFX_COLORS, armas próprias). */
const KITS: Record<string, AbilityKit> = {
  vampiro: VAMPIRE,
  vampira: VAMPIRE,
  vampiro_adulto: VAMPIRE,
  vampira_adulta: VAMPIRE,
  raposa: FOX,
  raposa_f: FOX,
  raposa_adulto: FOX,
  raposa_adulta: FOX,
  aurion: kit("solar", "#ffc94d"),
  cavaleiro: kit("solar", "#ffc94d"),
  morkhan: kit("shadow", "#a45bff"),
  noctis: kit("shadow", "#7f8cff"),
  brutamontes: kit("shadow", "#a838ff"),
  garras: kit("shadow", "#a838ff"),
  zephyra: kit("storm", "#58c6ff"),
  kragor: kit("stone", "#d0763a"),
  golem: kit("stone", "#33ff4d"),
  maru: kit("tide", "#3fd9c8"),
  iris: kit("prism", "#ff6bd6"),
  aeryn: kit("gear", "#e0a050"),
  ciborgue: kit("gear", "#ff8a1f"),
}

const DEFAULT = kit("steel", "#ffb02e")

/** O ringue do Boxe não usa a identidade do corpo: lá todo mundo é boxeador. */
export function abilityKit(body: string | null | undefined, stage?: string): AbilityKit {
  if (stage === "ring") return DEFAULT
  return KITS[body ?? ""] ?? DEFAULT
}
