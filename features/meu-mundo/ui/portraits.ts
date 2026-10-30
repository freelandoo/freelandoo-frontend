// features/meu-mundo/ui/portraits.ts — o retrato de cada corpo/skin. Imagem
// pequena e estática (sem 3D): STATUS, notificações e cards usam a mesma.
//
// mm3d-30: o personagem PADRÃO (as quatro condições físicas — o corpo muda no
// 3D, o rosto é o mesmo) ganhou a ilustração do Alex, em dois recortes:
// 4:5 para cards retangulares e o ROSTO para círculos (a piscadinha no meio).
// Cada skin tem o retrato e a folha de 12 expressões dela (fontes em
// PERSONAGENS/STANDARD/<personagem>, recortadas por
// pipeline/build_portraits_2d.py); os avisos falam com a expressão certa.

import type { BodyId } from "../types"
import { byGod, isGod } from "../gods"

const V2 = "/meu-mundo/retratos/v2"
const STANDARD = `${V2}/padrao.webp`
const STANDARD_FACE = `${V2}/padrao-rosto.webp`
// A personagem feminina (mm3d-30): retrato e expressões próprios, mesmo fundo.
const FEMALE = `${V2}/feminina.webp`
const FEMALE_FACE = `${V2}/feminina-rosto.webp`
// Ekaterina (mm3d-30): retrato no Coliseu neon e expressões próprias.
const EKATERINA = `${V2}/ekaterina.webp`
const EKATERINA_FACE = `${V2}/ekaterina-rosto.webp`

/** Retrato 4:5 (cards retangulares, STATUS). */
export const PORTRAIT: Record<BodyId, string> = {
  normal: STANDARD,
  slim: STANDARD,
  fat: STANDARD,
  strong: STANDARD,
  sergio: `${V2}/sergio.webp`,
  female: FEMALE,
  ekaterina: EKATERINA,
  // mm3d-50: deuses — retrato PROVISÓRIO renderizado do modelo (pipeline/build_portraits_deuses.py).
  ...byGod((g) => `${V2}/deus-${g}.webp`),
}

/** Recorte do rosto para círculos (avatar, notificação). */
const FACE: Record<BodyId, string> = {
  normal: STANDARD_FACE,
  slim: STANDARD_FACE,
  fat: STANDARD_FACE,
  strong: STANDARD_FACE,
  sergio: `${V2}/sergio-rosto.webp`,
  female: FEMALE_FACE,
  ekaterina: EKATERINA_FACE,
  ...byGod((g) => `${V2}/deus-${g}-rosto.webp`),
}

export const faceOf = (body: BodyId | null | undefined) => FACE[body ?? "normal"] ?? STANDARD_FACE

/** Para quem só tem a URL do retrato 4:5 (Portrait redondo do STATUS). */
export const faceForPortrait = (src: string) => (src === STANDARD ? STANDARD_FACE : src === FEMALE ? FEMALE_FACE : src === EKATERINA ? EKATERINA_FACE : src === PORTRAIT.sergio ? FACE.sergio : src.replace(/\/deus-([a-z]+)\.webp$/, "/deus-$1-rosto.webp"))

export type Expression =
  | "worried"
  | "fever"
  | "happy"
  | "satisfied"
  | "grateful"
  | "sleepy"
  | "exhausted"
  | "stressed"
  | "thirsty"
  | "nauseous"
  | "crying"
  | "determined"

/** Prefixo da folha de expressões de cada corpo (o padrão vale para as quatro condições). */
export function expressionSrc(body: BodyId | null | undefined, e: Expression | null): string {
  if (!e) return faceOf(body)
  if (body === "sergio") return `${V2}/expr-sergio-${e}.webp`
  if (body === "female") return `${V2}/expr-feminina-${e}.webp`
  if (body === "ekaterina") return `${V2}/expr-ekaterina-${e}.webp`
  // Deuses ainda sem folha de expressões: o rosto.
  if (isGod(body)) return faceOf(body)
  return `${V2}/expr-${e}.webp`
}
