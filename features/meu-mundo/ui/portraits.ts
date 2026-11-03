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
import { byClanBody, isClanBody } from "../classes"

const V2 = "/meu-mundo/retratos/v2"
/**
 * 2026-11-03: as fotos de perfil novas do Alex ("laminas de emoções/PERFIL"),
 * recortadas por pipeline/build_emotions.py — valem para todo lugar que mostra
 * o retrato (STATUS, placa de luta, HUD, escolha da classe) e o rosto.
 */
const V3 = "/meu-mundo/retratos/v3"
const V3_BODIES = ["garras", "raposa_f", "vampiro_adulto", "cavaleiro", "vampira", "vampira_adulta", "maru", "morkhan", "zephyra", "golem", "iris", "vampiro", "kragor", "aeryn", "brutamontes", "aurion", "noctis", "raposa_adulta", "raposa", "raposa_adulto", "ciborgue"] as const
const v3Portraits = Object.fromEntries(V3_BODIES.map((b) => [b, `${V3}/${b}.webp`])) as Record<(typeof V3_BODIES)[number], string>
const v3Faces = Object.fromEntries(V3_BODIES.map((b) => [b, `${V3}/${b}-rosto.webp`])) as Record<(typeof V3_BODIES)[number], string>
/** O Lobo (monstro da luta, sem corpo de jogador). */
export const WOLF_PORTRAIT = `${V3}/lobo.webp`
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
  // mm3d-58: classes — retrato PROVISÓRIO renderizado do modelo (como os deuses).
  // 2026-11-01: refeitos (modelos novos, rosto e cabelo com mais detalhe).
  ...byClanBody((b) => `${V2}/classe-${b}_m58e.webp`),
  // brutamontes (monstro e skin de admin): a foto nova vem no v3
  ...v3Portraits,
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
  ...byClanBody((b) => `${V2}/classe-${b}_m58e-rosto.webp`),
  ...v3Faces,
}

export const faceOf = (body: BodyId | null | undefined) => FACE[body ?? "normal"] ?? STANDARD_FACE

/** Para quem só tem a URL do retrato 4:5 (Portrait redondo do STATUS). */
export const faceForPortrait = (src: string) => (src === STANDARD ? STANDARD_FACE : src === FEMALE ? FEMALE_FACE : src === EKATERINA ? EKATERINA_FACE : src === PORTRAIT.sergio ? FACE.sergio : src.startsWith(`${V3}/`) ? src.replace(/\.webp$/, "-rosto.webp") : src.replace(/\/(deus|classe)-([a-z0-9_]+)\.webp$/, "/$1-$2-rosto.webp"))

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
  if (isGod(body) || isClanBody(body)) return faceOf(body)
  return `${V2}/expr-${e}.webp`
}

// ═══ EMOÇÕES (2026-11-03, pedido do Alex: "agora serão apenas 6") ═══════════
// Raiva, triste, feliz, doente, cansado e amando. As lâminas do Alex viraram
// recortes de meio corpo SEM fundo (pipeline/build_emotions.py →
// retratos/v3/emo/<corpo>-<emoção>.webp) — a notificação mostra o personagem
// saindo da moldura. Quem ainda não tem a lâmina usa a expressão antiga mais
// perto (padrão, feminina, Sergio, Ekaterina) ou o rosto.
export type Emotion = "happy" | "sad" | "loving" | "angry" | "tired" | "sick"
export const EMOTIONS: Emotion[] = ["happy", "sad", "loving", "angry", "tired", "sick"]

const ALL6: Emotion[] = EMOTIONS
/** Quais lâminas existem (o mesmo que retratos/v3/emo/manifest.json). */
const EMOTION_ART: Partial<Record<BodyId, Emotion[]>> = {
  aeryn: ALL6,
  aurion: ALL6,
  cavaleiro: ALL6,
  ciborgue: ALL6,
  garras: ALL6,
  golem: ALL6,
  iris: ALL6,
  kragor: ALL6,
  maru: ALL6,
  morkhan: ALL6,
  noctis: ALL6,
  raposa: ALL6,
  vampira: ALL6,
  vampira_adulta: ALL6,
  vampiro: ALL6,
  zephyra: ALL6,
  // 2026-11-03 (2ª leva): vampiro adulto e as três raposas
  vampiro_adulto: ALL6,
  raposa_f: ALL6,
  raposa_adulto: ALL6,
  raposa_adulta: ALL6,
}

/** A expressão antiga (folha de 12) mais perto de cada emoção. */
const LEGACY: Record<Emotion, Expression> = { happy: "happy", sad: "crying", loving: "grateful", angry: "stressed", tired: "exhausted", sick: "fever" }

/** As 12 expressões antigas caem nas 6 emoções (avisos que ainda falam em Expression). */
export const EMOTION_OF: Record<Expression, Emotion> = {
  worried: "sad",
  fever: "sick",
  happy: "happy",
  satisfied: "happy",
  grateful: "loving",
  sleepy: "tired",
  exhausted: "tired",
  stressed: "angry",
  thirsty: "sad",
  nauseous: "sick",
  crying: "sad",
  determined: "happy",
}

/**
 * A imagem da emoção: `cutout` = meio corpo sem fundo (sai da moldura);
 * senão é um retrato quadrado (fica dentro da moldura).
 */
export function emotionArt(body: BodyId | null | undefined, e: Emotion | null): { src: string; cutout: boolean } {
  const b = body ?? "normal"
  if (e && EMOTION_ART[b]?.includes(e)) return { src: `${V3}/emo/${b}-${e}.webp`, cutout: true }
  if (e && (b === "sergio" || b === "female" || b === "ekaterina" || b === "normal" || b === "slim" || b === "fat" || b === "strong")) return { src: expressionSrc(b, LEGACY[e]), cutout: false }
  return { src: faceOf(b), cutout: false }
}
