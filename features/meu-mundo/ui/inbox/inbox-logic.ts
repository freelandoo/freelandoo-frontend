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
import type { Expression } from "../portraits"

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
}

/** Expressão para as notificações do servidor (necessidade usa a tabela acima). */
export function noticeExpression(n: Pick<MMNotice, "kind" | "code">): Expression | null {
  if (n.kind === "need") return NEED_EXPRESSION[n.code as LifeNeedId] ?? "worried"
  if (n.kind === "gift") return "grateful"
  if (n.kind === "purchase") return "happy"
  if (n.kind === "life") {
    if (n.code === "hospital_out") return "happy"
    if (n.code === "born") return "determined"
    if (n.code === "death") return "crying"
    if (n.code === "diabetes" || n.code === "hypertension") return "worried"
    return "fever"
  }
  return null // oficial e promoção: identidade da plataforma, não o rosto
}

/** Quem "fala" no card: o próprio personagem, ou a plataforma. */
export const speaksAsCharacter = (n: Pick<MMNotice, "kind">) => n.kind === "need" || n.kind === "life" || n.kind === "gift" || n.kind === "purchase"

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
      return { title: lifeTitle(n.code, t, n.data.generation), line: null }
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
      return t("needStarving", "Nossa, estou com muita fome!")
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
  const recently = now - (q.shown[card.group] ?? -Infinity) < SAME_CARD_MS
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
