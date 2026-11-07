// features/meu-mundo/laminas/abilities/registry.ts — quem é quem nas habilidades (2026-11-07).
//
// A REGRA é uma só para todo mundo: Corte Mágico, Investida, Escudo e Poder Máximo, em
// sim/fight.ts, re-simulados pelo servidor. Aqui fica só a APRESENTAÇÃO de cada personagem:
// nome, ícone, cor e o poder dele (abilities/signatures.ts). Nada daqui muda dano ou recarga.
//
// Sem Babylon de propósito: a tela (skill-hud) lê este arquivo.

import type { SkillId } from "../sim/fight"
import { signatureOf, type FxFamily, type NameText, type Signature } from "./signatures"

export type AbilitySlot = SkillId | "ult"
export type { FxFamily }

export interface SlotArt {
  /** Caminho a partir de /meu-mundo/laminas (sem extensão). */
  icon: string
  name: NameText
}

export interface AbilityKit {
  family: FxFamily
  /** Cor do aro e do botão. */
  tone: string
  slots: Record<AbilitySlot, SlotArt>
  sig: Signature | null
}

/** No ringue do Boxe ninguém usa poder de personagem: lá todo mundo é boxeador. */
const RING: AbilityKit = {
  family: "steel",
  tone: "#ffb02e",
  sig: null,
  slots: {
    slash: { icon: "skills/slash", name: { key: "skillSlash", fallback: "Corte Mágico" } },
    dash: { icon: "skills/dash", name: { key: "skillDash", fallback: "Investida Relâmpago" } },
    shield: { icon: "skills/shield", name: { key: "skillShield", fallback: "Escudo de Luz" } },
    ult: { icon: "skills/ult", name: { key: "skillUlt", fallback: "Poder Máximo" } },
  },
}

export function abilityKit(body: string | null | undefined, stage?: string): AbilityKit {
  if (stage === "ring") return RING
  const sig = signatureOf(body)
  const slot = (id: AbilitySlot): SlotArt => ({ icon: `abilities/${sig.art}/${id}`, name: sig.names[id] })
  return { family: sig.family, tone: sig.pal[2], sig, slots: { slash: slot("slash"), dash: slot("dash"), shield: slot("shield"), ult: slot("ult") } }
}
