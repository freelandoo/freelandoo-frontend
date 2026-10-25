// features/meu-mundo/ui/chat/chat-logic.ts — mm3d-32: regra pura do chat (sem React).
//
// O Global chega pela sala do jogo (mensagem "chat") e pelo histórico
// (GET /chat/global); a mesma linha pode vir pelos dois — o id decide. A
// mensagem que eu envio aparece na hora como "pendente" e vira a confirmada
// pelo id do cliente quando o servidor responde. A sala entrega a MINHA linha
// também (às vezes antes da resposta do POST): ela "adota" a pendente de
// mesmo texto, e a resposta depois só confirma — nunca duas linhas.
//
// Sem imports: o teste do back (test/unit/meuMundoChatLogic.test.js) carrega
// este arquivo direto no Node.

export type Line = {
  id: string
  at: string | null
  text?: string
  name?: string
  avatar?: string | null
  profileId?: string | null
  session?: string | null
  mine?: boolean
  pending?: boolean
  clientId?: string
}

export const LINES_MAX = 200
export const GLOBAL_MAX = 500
export const DIRECT_MAX = 4000

const time = (l: Line) => (l.at ? Date.parse(l.at) : Number.MAX_SAFE_INTEGER)

export function mergeLines(cur: Line[], incoming: Line[]): Line[] {
  const byId = new Map<string, Line>()
  for (const l of cur) byId.set(l.id, l)
  for (const l of incoming) {
    // Minha linha real chegando antes da confirmação: some a pendente de mesmo texto.
    if (!byId.has(l.id) && l.mine && !l.pending) {
      for (const [k, p] of byId) {
        if (p.pending && p.text === l.text) {
          byId.delete(k)
          break
        }
      }
    }
    byId.set(l.id, { ...byId.get(l.id), ...l })
  }
  const all = [...byId.values()].sort((a, b) => time(a) - time(b))
  return all.length > LINES_MAX ? all.slice(all.length - LINES_MAX) : all
}

export function pendingLine(clientId: string, text: string): Line {
  return { id: `pending:${clientId}`, clientId, text, at: null, mine: true, pending: true }
}

export function confirmLine(cur: Line[], clientId: string, real: Line): Line[] {
  return mergeLines(
    cur.filter((l) => l.clientId !== clientId),
    [{ ...real, mine: true, pending: false }],
  )
}

export function dropPending(cur: Line[], clientId: string): Line[] {
  return cur.filter((l) => l.clientId !== clientId)
}

export function cleanDraft(raw: string, max: number): string | null {
  const s = raw.trim()
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

/** Não lidas do Global: só as dos outros, e zera enquanto a aba Global está à vista. */
export function bumpUnread(n: number, line: { mine?: boolean }, open: boolean): number {
  if (open) return 0
  return line.mine ? n : n + 1
}

export function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (Number(c) ^ ((Math.random() * 16) >> (Number(c) / 4))).toString(16),
  )
}
