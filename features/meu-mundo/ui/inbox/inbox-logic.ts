// features/meu-mundo/ui/inbox/inbox-logic.ts — O QUE uma notificação diz e
// QUANDO ela aparece como card (mm3d-30). Puro: sem React, sem Date.now.
//
// Duas fontes de card, uma fila só:
//  • necessidades: needs-logic.ts decide o momento (memória de 45 s / 10 min /
//    20 min do mm3d-28) e entrega uma NeedLine;
//  • servidor: a sala manda "notice" (presente, comunicado, recibo, vida).
// A fila mostra no máximo `maxVisible` cards (1 no celular, 2 no computador),
// o mais urgente primeiro; cada card fica CARD_MS na tela (pausa com o
// ponteiro em cima ou foco dentro) e sai sozinho. Sair da tela não marca
// como lido — o histórico do sino é que guarda.

import type { LifeNeedId, MMNotice } from "../../types"
import { wishLine, type WishId } from "../../soul"
import { EMOTIONS, EMOTION_OF, type Emotion, type Expression } from "../portraits"

export const CARD_MS = 15_000
/** A mesma notificação (tipo + código) não volta como card antes disso. */
export const SAME_CARD_MS = 2 * 60_000
/** Fila de espera: além disso, os mais antigos de menor prioridade caem (ficam no sino). */
export const QUEUE_MAX = 4

/** Expressão do personagem padrão para cada necessidade (folha do Alex). */
export const NEED_EXPRESSION: Record<LifeNeedId, Expression> = {
  hospital: "fever",
  unwell: "nauseous",
  exhausted: "exhausted",
  starving: "crying",
  hungry: "worried",
  sleep: "sleepy",
  tired: "exhausted",
  stressed: "stressed",
  aging: "exhausted",
  fridge_empty: "worried",
}

/**
 * 2026-11-03 (Alex): só 6 emoções — raiva, triste, feliz, doente, cansado e
 * amando. "Com fome precisa mostrar ele triste." Nunca uma emoção feliz num
 * aviso ruim.
 */
export const NEED_EMOTION: Record<LifeNeedId, Emotion> = {
  hospital: "sick",
  unwell: "sick",
  exhausted: "tired",
  starving: "sad",
  hungry: "sad",
  sleep: "tired",
  tired: "tired",
  stressed: "angry",
  aging: "tired",
  // mm3d-72: "Putz! A geladeira tá vazia! Ah, meu Deus!"
  fridge_empty: "sad",
}

/** Emoção para as notificações do servidor (necessidade usa a tabela acima). */
export function noticeEmotion(n: Pick<MMNotice, "kind" | "code"> & { data?: MMNotice["data"] }): Emotion | null {
  if (n.kind === "need") return NEED_EMOTION[n.code as LifeNeedId] ?? "sad"
  if (n.kind === "dm") return "happy"
  // mm3d-72: a fala traz a emoção; desejo pedido/atendido/ignorado
  if (n.kind === "life" && n.code === "chatter") return (EMOTIONS as string[]).includes(n.data?.emotion ?? "") ? (n.data!.emotion as Emotion) : "happy"
  if (n.kind === "life" && n.code === "wish") return "happy"
  if (n.kind === "life" && n.code === "wish_ok") return "loving"
  if (n.kind === "life" && n.code === "wish_fail") return "sad"
  const e = noticeExpression(n)
  if (!e) return null
  if (n.kind === "life" && (n.code === "fined" || n.code === "jailed")) return "angry"
  return EMOTION_OF[e]
}

/** Expressão para as notificações do servidor (necessidade usa a tabela acima). */
export function noticeExpression(n: Pick<MMNotice, "kind" | "code"> & { data?: MMNotice["data"] }): Expression | null {
  if (n.kind === "need") return NEED_EXPRESSION[n.code as LifeNeedId] ?? "worried"
  if (n.kind === "gift") return "grateful"
  if (n.kind === "purchase") return "happy"
  if (n.kind === "life") {
    if (n.code === "hospital_out" || n.code === "adult" || n.code === "wish" || n.code === "wish_ok") return "happy"
    if (n.code === "chatter") return n.data?.emotion === "sad" ? "worried" : n.data?.emotion === "angry" ? "stressed" : "happy"
    if (n.code === "wish_fail") return "worried"
    if (n.code === "born") return "determined"
    if (n.code === "death") return "crying"
    if (n.code === "funeral") return n.data?.paidBy === "freelandoo" ? "grateful" : "worried"
    if (n.code === "diabetes" || n.code === "hypertension" || n.code === "fined" || n.code === "jailed") return "worried"
    return "fever"
  }
  return null // oficial e promoção: identidade da plataforma, não o rosto
}

/** Quem "fala" no card: o próprio personagem, ou a plataforma. */
/** Mensagem 1:1 (mm3d-33): o rosto normal (sem expressão) diz "Recebemos uma mensagem". */
export const speaksAsCharacter = (n: Pick<MMNotice, "kind">) =>
  n.kind === "need" || n.kind === "life" || n.kind === "gift" || n.kind === "purchase" || n.kind === "dm"

type Tr = (key: string, fallback: string) => string

/** Título e linha de apoio de uma notificação do servidor (texto do jogo traduz; o do admin não). */
export function noticeText(n: MMNotice, t: Tr): { title: string; line: string | null } {
  const num = (v: number | undefined) => String(v ?? 0)
  switch (n.kind) {
    case "need":
      return { title: needTitle(n.code as LifeNeedId, t, n.data.hours), line: null }
    case "gift":
      return { title: t("ntGiftTitle", "Chegou um presente para você!"), line: n.data.title ?? null }
    case "purchase":
      if (n.code === "polens_credited")
        return {
          title: t("ntPolensTitle", "Poléns creditados"),
          line: t("ntPolensLine", "{n} Poléns entraram na sua carteira.").replace("{n}", num(n.data.polens)),
        }
      return { title: t("ntReceiptTitle", "Compra confirmada"), line: n.data.title ?? null }
    case "official":
      return { title: n.data.title ?? t("ntOfficial", "Comunicado oficial"), line: t("ntOfficialLine", "Comunicado do Meu Mundo") }
    case "promo":
      return { title: n.data.title ?? t("ntPromo", "Promoção"), line: t("ntPromoLine", "Promoção do Meu Mundo") }
    case "life":
      // mm3d-72: fala do hóspede (montada no aparelho, já traduzida)
      if (n.code === "chatter") return { title: n.data.title ?? "", line: null }
      if (n.code === "funeral")
        return n.data.paidBy === "freelandoo"
          ? { title: t("ntFuneralFree", "A Freelandoo pagou o funeral."), line: t("ntFuneralFreeLine", "Ele morreu de velhice. O novo hóspede herdou 20% dos atributos.") }
          : { title: t("ntFuneralPaid", "Funeral pago: {n} moedas.").replace("{n}", String(n.data.coins ?? 0)), line: t("ntFuneralPaidLine", "Sem herança: o novo hóspede começou do zero.") }
      // mm3d-37f: multa (praça) e prisão (reincidência na praça ou atropelamento).
      if (n.code === "fined")
        return { title: t("ntFined", "Multa de {n} moedas.").replace("{n}", String(n.data.coins ?? 0)), line: t("ntFinedLine", "Dirigir na praça é proibido. Na próxima vez no mesmo dia, prisão.") }
      if (n.code === "jailed")
        return {
          title: t("ntJailed", "Fui preso: {n} minutos na delegacia.").replace("{n}", String(n.data.minutes ?? 0)),
          line: n.data.reason === "atropelamento" ? t("ntJailedHit", "Atropelei alguém com o carro.") : t("ntJailedPlaza", "Dirigi na praça de novo no mesmo dia."),
        }
      // mm3d-36: aviso único (uma vez por conta) de que as cores existem.
      if (n.code === "colors_hint")
        return { title: t("ntColorsTitle", "Você pode mudar as cores do seu personagem"), line: t("ntColorsLine", "No STATUS → SKIN → Cores: camiseta, calça, pele e cabelo.") }
      // mm3d-72: o que ele quer (pela personalidade) e se o dono atendeu
      if (n.code === "wish" && n.data.wish) return { title: wishLine(n.data.wish as WishId, t), line: t("ntWishLine", "Se você fizer, ele vai gostar mais de você.") }
      if (n.code === "wish_ok") return { title: t("ntWishOk", "Você fez o que eu queria! Valeu!"), line: t("ntWishOkLine", "Ele gostou mais de você.") }
      if (n.code === "wish_fail") return { title: t("ntWishFail", "Você nem ligou pro que eu pedi…"), line: t("ntWishFailLine", "Ele gostou menos de você.") }
      return { title: lifeTitle(n.code, t, n.data.generation), line: null }
    case "dm":
      return { title: t("ntDmTitle", "Recebemos uma mensagem"), line: n.data.from ? t("ntDmFrom", "De {name}").replace("{name}", n.data.from) : null }
  }
}

export function needTitle(id: LifeNeedId, t: Tr, hours?: number): string {
  switch (id) {
    case "hospital":
      return t("needHospital", "Estou internado. Preciso me recuperar.")
    case "unwell":
      return t("needUnwell", "Não estou me sentindo bem. Preciso de atendimento.")
    case "exhausted":
      return t("needExhausted", "Estou exausto. Preciso descansar.")
    case "starving":
      return t("needStarving2", "Estou morrendo de fome! Você vai me deixar passar fome assim?")
    case "hungry":
      return t("needHungry", "Estou ficando com fome.")
    case "sleep":
      return t("needSleep", "Já estou há {h} horas acordado. Preciso dormir.").replace("{h}", String(hours ?? 16))
    case "tired":
      return t("needTired", "Estou cansado.")
    case "stressed":
      return t("needStressed", "Estou muito estressado. Preciso de uma pausa.")
    case "aging":
      return t("needAging", "Sinto o peso da idade.")
    case "fridge_empty":
      return t("needFridgeEmpty", "Putz! A geladeira tá vazia! Ah, meu Deus!")
  }
}

function lifeTitle(code: string, t: Tr, generation?: number): string {
  switch (code) {
    case "death":
      return t("ntDeath", "Seu hóspede morreu.")
    case "heart_attack":
      return t("ntHeartAttack", "Ele teve um infarto!")
    case "hospital_in":
      return t("ntHospitalIn", "Fui levado ao hospital.")
    case "hospital_out":
      return t("ntHospitalOut", "Recebi alta do hospital!")
    case "diabetes":
      return t("ntDiabetes", "Fui diagnosticado com diabetes.")
    case "hypertension":
      return t("ntHypertension", "Fui diagnosticado com pressão alta.")
    case "adult":
      return t("ntAdult", "Virei adulto! Fiquei 20% mais forte, rápido e esperto, e a saúde voltou a 100.")
    case "born":
      return t("ntBorn", "Um novo hóspede chegou (geração {n}).").replace("{n}", String(generation ?? 1))
    default:
      return t("ntLife", "Algo mudou na vida do hóspede.")
  }
}

// ═══ a fila de cards ═══════════════════════════════════════════════════════
export interface Card {
  /** id único do card (id da notificação, ou "need:<chave>:<instante>") */
  key: string
  /** tipo + código, para não repetir o mesmo aviso em sequência */
  group: string
  priority: number
  at: number
  notice: MMNotice | null
  /** necessidade vinda do needs-logic (sem linha no servidor ainda) */
  need: { ids: LifeNeedId[]; level: number; hours?: number } | null
  /** espera própria para o mesmo grupo voltar (padrão SAME_CARD_MS) */
  repeatMs?: number
}

export interface Queue {
  visible: Card[]
  waiting: Card[]
  /** quando cada grupo foi mostrado pela última vez */
  shown: Record<string, number>
  /** ids já vistos (o mesmo push duas vezes — reconexão — não volta) */
  seen: string[]
}

export const emptyQueue = (): Queue => ({ visible: [], waiting: [], shown: {}, seen: [] })

const byUrgency = (a: Card, b: Card) => a.priority - b.priority || a.at - b.at

/** Entra um card novo: descartado se repetido, senão vai para a espera. */
export function enqueue(q: Queue, card: Card, now: number): Queue {
  if (q.seen.includes(card.key)) return q
  const recently = now - (q.shown[card.group] ?? -Infinity) < (card.repeatMs ?? SAME_CARD_MS)
  const already = q.visible.some((c) => c.group === card.group) || q.waiting.some((c) => c.group === card.group)
  const seen = [...q.seen, card.key].slice(-100)
  // Urgentes (prioridade 1) furam a regra de repetição; o resto só vai ao sino.
  if ((recently || already) && card.priority > 1) return { ...q, seen }
  const waiting = [...q.waiting.filter((c) => c.group !== card.group), card].sort(byUrgency).slice(0, QUEUE_MAX)
  return { ...q, waiting, seen }
}

/** Promove da espera para a tela até `maxVisible`. */
export function promote(q: Queue, maxVisible: number, now: number): Queue {
  if (q.visible.length >= maxVisible || !q.waiting.length) return q
  const room = maxVisible - q.visible.length
  const take = q.waiting.slice(0, room)
  const shown = { ...q.shown }
  for (const c of take) shown[c.group] = now
  return { ...q, visible: [...q.visible, ...take].sort(byUrgency), waiting: q.waiting.slice(room), shown }
}

export function dismiss(q: Queue, key: string): Queue {
  return { ...q, visible: q.visible.filter((c) => c.key !== key) }
}
