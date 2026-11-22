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
import { byTall, isTall } from "../gods"
import { byClanBody, isClanBody } from "../classes"
import { byNpcBody, NPC_KIN, type NpcBody } from "../npc-bodies"

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
/** 22/11: NPCs com retrato próprio publicado em v3 (`<body>.webp` + `-rosto`). */
// 22/11: retratos próprios (ChatGPT, arte/retratos-npcs); quem falta usa o do povo
const NPC_V3 = new Set<NpcBody>(["npc_academia_raposa", "npc_acougueiro", "npc_aluna", "npc_aluno", "npc_anselmo", "npc_arauto", "npc_atendente_sangue", "npc_bento", "npc_beppe", "npc_cliente_raposa", "npc_cliente_vampiro", "npc_criogenista", "npc_davi", "npc_dora", "npc_fiel_vampiro", "npc_fulvo", "npc_juca", "npc_kaio", "npc_leitor", "npc_nara", "npc_neide", "npc_nivea", "npc_pipa", "npc_quirino", "npc_ronaldo", "npc_rosalia", "npc_sacerdotisa", "npc_salvia", "npc_tiburcio", "npc_tito", "npc_universitaria"])
const KIN_BODY = { rm: "raposa_adulto", rf: "raposa_adulta", vm: "vampiro_adulto", vf: "vampira_adulta" } as const
/** O Lobo (monstro da luta, sem corpo de jogador). */
export const WOLF_PORTRAIT = `${V3}/lobo.webp`
// 2026-11-14: o personagem padrão e a feminina saíram (e os retratos deles); o de reserva é o Sergio.
const SERGIO_FACE = `${V2}/sergio-rosto.webp`
// Ekaterina (mm3d-30): retrato no Coliseu neon e expressões próprias.
const EKATERINA = `${V2}/ekaterina.webp`
const EKATERINA_FACE = `${V2}/ekaterina-rosto.webp`

/** Retrato 4:5 (cards retangulares, STATUS). */
export const PORTRAIT: Record<BodyId, string> = {
  sergio: `${V2}/sergio.webp`,
  ekaterina: EKATERINA,
  // mm3d-50: deuses — retrato PROVISÓRIO renderizado do modelo (pipeline/build_portraits_deuses.py).
  ...byTall((g) => `${V2}/deus-${g}.webp`),
  // mm3d-58: classes — retrato PROVISÓRIO renderizado do modelo (como os deuses).
  // 2026-11-01: refeitos (modelos novos, rosto e cabelo com mais detalhe).
  ...byClanBody((b) => `${V2}/classe-${b}_m58e.webp`),
  // brutamontes (monstro e skin de admin): a foto nova vem no v3
  ...v3Portraits,
  // 22/11: os NPCs — retrato próprio no v3; quem ainda não tem usa o do povo dele
  ...byNpcBody((b) => (NPC_V3.has(b) ? `${V3}/${b}.webp` : v3Portraits[KIN_BODY[NPC_KIN[b]]])),
  bastor: `${V3}/bastor.webp`,
}

/** Recorte do rosto para círculos (avatar, notificação). */
const FACE: Record<BodyId, string> = {
  sergio: SERGIO_FACE,
  ekaterina: EKATERINA_FACE,
  ...byTall((g) => `${V2}/deus-${g}-rosto.webp`),
  ...byClanBody((b) => `${V2}/classe-${b}_m58e-rosto.webp`),
  ...v3Faces,
  ...byNpcBody((b) => (NPC_V3.has(b) ? `${V3}/${b}-rosto.webp` : v3Faces[KIN_BODY[NPC_KIN[b]]])),
  bastor: `${V3}/bastor-rosto.webp`,
}

export const faceOf = (body: BodyId | null | undefined) => FACE[body ?? "sergio"] ?? SERGIO_FACE

/** Para quem só tem a URL do retrato 4:5 (Portrait redondo do STATUS). */
export const faceForPortrait = (src: string) => (src === EKATERINA ? EKATERINA_FACE : src === PORTRAIT.sergio ? FACE.sergio : src.startsWith(`${V3}/`) ? src.replace(/\.webp$/, "-rosto.webp") : src.replace(/\/(deus|classe)-([a-z0-9_]+)\.webp$/, "/$1-$2-rosto.webp"))

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

/** Prefixo da folha de expressões de cada corpo (só Sergio e Ekaterina têm folha; o resto, o rosto). */
export function expressionSrc(body: BodyId | null | undefined, e: Expression | null): string {
  if (!e) return faceOf(body)
  if (body === "sergio") return `${V2}/expr-sergio-${e}.webp`
  if (body === "ekaterina") return `${V2}/expr-ekaterina-${e}.webp`
  // Deuses, classes e monstros ainda sem folha de expressões: o rosto.
  return faceOf(body)
}

// ═══ EMOÇÕES (2026-11-03, pedido do Alex: "agora serão apenas 6") ═══════════
// Raiva, triste, feliz, doente, cansado e amando. As lâminas do Alex viraram
// recortes de meio corpo SEM fundo (pipeline/build_emotions.py →
// retratos/v3/emo/<corpo>-<emoção>.webp) — a notificação mostra o personagem
// saindo da moldura. Quem ainda não tem a lâmina usa a expressão antiga mais
// perto (padrão, feminina, Sergio, Ekaterina) ou o rosto.
/** As 6 primeiras (lâminas de 2026-11-03). */
export type BaseEmotion = "happy" | "sad" | "loving" | "angry" | "tired" | "sick"
/**
 * 2026-11-15 (Alex: "precisamos criar mais expressões"): 6 novas, uma imagem por expressão, pelas falas que
 * não cabiam nas 6 — medo, susto, deboche, gargalhada, fome (a arte muda por classe) e determinado.
 * Plano: MEU MUNDO 3D/planos/2026-11-15-expressoes-novas.md. Até a arte de um corpo chegar, cada nova
 * mostra a antiga mais perto (`BASE_OF`).
 */
export type NewEmotion = "scared" | "surprised" | "smug" | "laughing" | "hungry" | "determined"
export type Emotion = BaseEmotion | NewEmotion
export const BASE_EMOTIONS: BaseEmotion[] = ["happy", "sad", "loving", "angry", "tired", "sick"]
export const NEW_EMOTIONS: NewEmotion[] = ["scared", "surprised", "smug", "laughing", "hungry", "determined"]
export const EMOTIONS: Emotion[] = [...BASE_EMOTIONS, ...NEW_EMOTIONS]
/** A antiga mais perto de cada nova (enquanto a arte não chega). */
export const BASE_OF: Record<Emotion, BaseEmotion> = {
  happy: "happy",
  sad: "sad",
  loving: "loving",
  angry: "angry",
  tired: "tired",
  sick: "sick",
  scared: "sad",
  surprised: "sad",
  smug: "angry",
  laughing: "happy",
  hungry: "happy",
  determined: "happy",
}

const ALL6: Emotion[] = BASE_EMOTIONS
/** As 12 (2026-11-15: as 6 novas chegaram; pipeline/build_emotions_single.py). 2026-11-17: deuses e skins
 * (Aurion, Golem e Cavaleiro sem boca); falta a Íris inteira e 3 do Morkhan. */
const ALL12: Emotion[] = EMOTIONS
/** Quais lâminas existem (o mesmo que retratos/v3/emo/manifest.json). */
const EMOTION_ART: Partial<Record<BodyId, Emotion[]>> = {
  aeryn: ALL12,
  aurion: ALL12,
  cavaleiro: ALL12,
  ciborgue: ALL12,
  garras: ALL12,
  golem: ALL12,
  iris: ALL6,
  kragor: ALL12,
  maru: ALL12,
  // faltam medo, susto e deboche do Morkhan (caem na antiga mais perto)
  morkhan: [...BASE_EMOTIONS, "laughing", "hungry", "determined"],
  noctis: ALL12,
  raposa: ALL12,
  vampira: ALL12,
  vampira_adulta: ALL12,
  vampiro: ALL12,
  zephyra: ALL12,
  // 2026-11-03 (2ª leva): vampiro adulto e as três raposas
  vampiro_adulto: ALL12,
  raposa_f: ALL12,
  raposa_adulto: ALL12,
  raposa_adulta: ALL12,
}

/** A expressão antiga (folha de 12) mais perto de cada emoção. */
const LEGACY: Record<BaseEmotion, Expression> = { happy: "happy", sad: "crying", loving: "grateful", angry: "stressed", tired: "exhausted", sick: "fever" }

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
  const b = body ?? "sergio"
  if (e && EMOTION_ART[b]?.includes(e)) return { src: `${V3}/emo/${b}-${e}.webp`, cutout: true }
  // expressão nova sem arte neste corpo: a antiga mais perto
  const base = e ? BASE_OF[e] : null
  if (base && base !== e && EMOTION_ART[b]?.includes(base)) return { src: `${V3}/emo/${b}-${base}.webp`, cutout: true }
  if (base && (b === "sergio" || b === "ekaterina")) return { src: expressionSrc(b, LEGACY[base]), cutout: false }
  return { src: faceOf(b), cutout: false }
}
