// features/meu-mundo/ui/inbox/chatter.ts — as falas do hóspede pela personalidade (mm3d-72).
//
// Pedido do Alex: "cria frases diferentes para cada personalidade, por exemplo o
// psicopata: hoje eu quero meter uma surra em todo mundo! o medroso: espero que a
// gente não entre em nenhuma luta hoje. Nossa, ficou de noite, melhor nem sairmos
// de casa hoje." Só desenho: a personalidade, o afeto e o apelido vêm do servidor
// (aviso `life`), a hora é a de Brasília. Vira um card do aparelho (não vai ao sino).

import type { MMNotice } from "../../types"
import { AFFECTION_NAME_AT, callName, type LifeSoul, type Temper } from "../../soul"
import type { Emotion } from "../portraits"
import { VOICE_PT, numbered, pickFresh, withVariants } from "./voice-pick"

type Tr = (key: string, fallback: string) => string
export type ChatterMoment = "enter" | "night" | "morning" | "idle"

/** Intervalo mínimo entre duas falas soltas (ms). */
export const CHATTER_GAP_MS = 6 * 60_000
/** Abaixo disto ele está magoado e a fala muda. */
const HURT_AT = 10

type Line = [key: string, pt: string, emotion: Emotion]

const LINES: Record<Temper, Record<ChatterMoment, Line[]>> = {
  psicopata: {
    enter: [
      ["chPsyEnter1", "Hoje eu quero meter uma surra em todo mundo!", "angry"],
      ["chPsyEnter2", "Acordei querendo briga. Quem vai ser o primeiro?", "angry"],
    ],
    night: [
      ["chPsyNight1", "A noite é a melhor hora pra caçar monstro.", "happy"],
      ["chPsyNight2", "Escureceu… agora sim os monstros saem. Hehe.", "happy"],
    ],
    morning: [["chPsyMorning1", "Bom dia. Tô com vontade de quebrar alguma coisa.", "angry"]],
    idle: [
      ["chPsyIdle1", "Tá muito parado aqui. Bora arrumar briga?", "angry"],
      ["chPsyIdle2", "Se alguém passar perto de mim hoje, vai apanhar.", "angry"],
    ],
  },
  covarde: {
    enter: [
      ["chCowEnter1", "Espero que a gente não entre em nenhuma luta hoje.", "sad"],
      ["chCowEnter2", "Vamos com calma hoje, tá? Nada de monstro.", "sad"],
    ],
    night: [
      ["chCowNight1", "Nossa, ficou de noite. Melhor nem sairmos de casa hoje.", "sad"],
      ["chCowNight2", "De noite os monstros aparecem… vamos pra casa?", "sad"],
    ],
    morning: [["chCowMorning1", "Ufa, amanheceu. Os monstros já foram embora?", "happy"]],
    idle: [
      ["chCowIdle1", "Ouviu esse barulho? Acho melhor a gente voltar.", "sad"],
      ["chCowIdle2", "Não gosto de ficar na rua muito tempo…", "sad"],
    ],
  },
  comilao: {
    enter: [
      ["chGluEnter1", "Antes de tudo: o que tem pra comer?", "happy"],
      ["chGluEnter2", "Que bom que você chegou! Tô com fome.", "happy"],
    ],
    night: [["chGluNight1", "Tá na hora de um lanchinho da madrugada!", "happy"]],
    morning: [["chGluMorning1", "Bom dia! Café da manhã reforçado, né?", "happy"]],
    idle: [
      ["chGluIdle1", "Meu estômago tá roncando de novo…", "sad"],
      ["chGluIdle2", "Bem que a gente podia passar na taverna.", "happy"],
    ],
  },
  bondoso: {
    enter: [
      ["chKindEnter1", "Que bom te ver! Vamos fazer um dia bonito hoje.", "loving"],
      ["chKindEnter2", "Oi! Senti sua falta.", "loving"],
    ],
    night: [["chKindNight1", "Vamos descansar? Amanhã a gente cuida de todo mundo.", "tired"]],
    morning: [["chKindMorning1", "Bom dia! Que tal passar na igreja hoje?", "happy"]],
    idle: [
      ["chKindIdle1", "Será que alguém no bairro precisa de ajuda?", "happy"],
      ["chKindIdle2", "Obrigado por cuidar de mim.", "loving"],
    ],
  },
  competitivo: {
    enter: [
      ["chCompEnter1", "Hoje eu vou ganhar tudo! Bora pros minijogos!", "happy"],
      ["chCompEnter2", "Bora! Tem recorde pra bater hoje.", "happy"],
    ],
    night: [["chCompNight1", "Ainda dá tempo de bater um recorde antes de dormir.", "happy"]],
    morning: [["chCompMorning1", "Novo dia, novo recorde. Partiu treinar!", "happy"]],
    idle: [
      ["chCompIdle1", "Ficar parado não ganha campeonato…", "angry"],
      ["chCompIdle2", "Aposto que eu ganho de todo mundo no Paint.", "happy"],
    ],
  },
}

const LOVE: Line[] = [
  ["chLove1", "{nick}, você é o melhor dono do mundo!", "loving"],
  ["chLove2", "Eu gosto muito de você, {nick}.", "loving"],
]
const HURT: Line[] = [
  ["chHurt1", "Você nem liga pra mim, né, {nick}?", "sad"],
  ["chHurt2", "Tô chateado com você, {nick}.", "angry"],
]

/** Hora de Brasília (0–23). */
export function brtHour(at = Date.now()) {
  return new Date(at - 3 * 3_600_000).getUTCHours()
}
export const isNight = (h: number) => h >= 18 || h < 6

/**
 * As falas possíveis com as versões (2026-11-17, Alex): cada fala da personalidade + 5 versões
 * (`<chave>_v1…5`); mágoa e carinho na voz de cada personalidade (`chHurt_<p>_N`) + as 2 gerais.
 */
function expand(list: Line[], temper: Temper, mood: "hurt" | "love" | null): Line[] {
  if (mood) {
    // a mágoa/o carinho na voz dele; as 2 gerais só para quem ainda não tem as suas
    const emotion: Emotion = mood === "love" ? "loving" : "sad"
    const own = numbered(`${mood === "love" ? "chLove" : "chHurt"}_${temper}`).map((k): Line => [k, VOICE_PT[k][0], emotion])
    if (own.length) return own
  }
  const out: Line[] = []
  for (const [key, pt, emotion] of list) for (const k of withVariants(key)) out.push([k, k === key ? pt : VOICE_PT[k][0], emotion])
  return out
}

/** Uma fala para o momento (sorteio por `roll` 0–1, para dar para testar; sem repetir as últimas). */
export function chatterLine(soul: LifeSoul, moment: ChatterMoment, t: Tr, roll = Math.random()): { title: string; emotion: Emotion } {
  const nick = callName(soul, t)
  let list = LINES[soul.temper]?.[moment] ?? LINES.bondoso.idle
  let mood: "hurt" | "love" | null = null
  // afeto muda o tom das falas soltas (e às vezes da entrada)
  if ((moment === "idle" || moment === "enter") && nick) {
    if (soul.affection <= HURT_AT && roll < 0.6) {
      list = HURT
      mood = "hurt"
    } else if (soul.affection >= AFFECTION_NAME_AT && roll < 0.4) {
      list = LOVE
      mood = "love"
    }
  }
  const all = expand(list, soul.temper, mood)
  const family = `chat:${soul.temper}:${mood ?? moment}`
  const pick = pickFresh(family, all.map(([k]) => k), (roll * 997) % 1)
  const [key, pt, emotion] = all.find(([k]) => k === pick) ?? all[0]
  const title = t(key, pt).replace("{nick}", nick)
  return { title, emotion }
}

/** O card local da fala (mesmo molde dos avisos; não vai ao sino). */
export function chatterNotice(line: { title: string; emotion: Emotion }, at = new Date(), topic?: string): MMNotice {
  const iso = at.toISOString()
  return { id: `chat:${topic ?? ""}:${iso}`, kind: "life", code: "chatter", priority: 4, data: { title: line.title, emotion: line.emotion, topic }, mailId: null, createdAt: iso, read: false }
}

/** Todas as chaves (o script de i18n confere). */
export const CHATTER_KEYS = [...Object.values(LINES).flatMap((m) => Object.values(m).flat()), ...LOVE, ...HURT].map(([k, pt]) => [k, pt] as const)
