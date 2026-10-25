// features/meu-mundo/ui/chat/use-direct-thread.ts — mm3d-32: thread 1:1 dentro do jogo.
//
// É a MESMA conversa do /mensagens (histórico na Freelandoo). Tempo real pelo
// socket do site: inscrição conferida no banco (conversation:subscribe) e
// "conversation:message" traz a mensagem — sem poll curto (regra 6). A minha
// mensagem chega pelo socket também (às vezes antes da resposta do POST): o
// merge por id + adoção da pendente (chat-logic) mostra uma só.
"use client"

import { useCallback, useEffect, useState } from "react"
import { emitRealtime, onRealtime } from "@/lib/realtime"
import { getDirectMessages, mapDm, postDirectMessage, postDirectRead, type DmMessage } from "../../data"
import { cleanDraft, confirmLine, dropPending, DIRECT_MAX, mergeLines, newClientId, pendingLine } from "./chat-logic"

const READ_DEBOUNCE_MS = 1000

/** `error` é o código cru ("network", texto do servidor): quem mostra traduz. */
export function useDirectThread(token: string | null, conversationId: string | null, actorId: string | null) {
  const [items, setItems] = useState<DmMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!token || !conversationId || !actorId) return
    let alive = true
    let readTimer: ReturnType<typeof setTimeout> | null = null
    // Uma leitura por rajada: várias mensagens seguidas = um POST /read. O
    // markRead do back não avisa o socket, então o contador do site
    // (use-nav-counts) relê pelo evento de janela — só esse caminho.
    const markRead = () => {
      if (readTimer) clearTimeout(readTimer)
      readTimer = setTimeout(() => {
        readTimer = null
        void postDirectRead(token, conversationId, actorId).then(() => window.dispatchEvent(new Event("mensagens:unread-changed")))
      }, READ_DEBOUNCE_MS)
    }
    setItems([])
    setError(null)
    setLoading(true)
    void getDirectMessages(token, conversationId, actorId).then((r) => {
      if (!alive) return
      setLoading(false)
      if (!r.ok) return setError(r.status === 0 ? "network" : r.error)
      setItems((cur) => mergeLines(cur, r.data.items) as DmMessage[])
      markRead()
    })
    emitRealtime("conversation:subscribe", { id_conversation: conversationId })
    const off = onRealtime("conversation:message", (raw) => {
      const p = raw as { id_conversation?: string; message?: Parameters<typeof mapDm>[0] } | null
      if (!alive || p?.id_conversation !== conversationId || !p.message?.id_message) return
      const m = mapDm(p.message, actorId)
      setItems((cur) => mergeLines(cur, [m]) as DmMessage[])
      if (!m.mine) markRead()
    })
    return () => {
      alive = false
      off()
      emitRealtime("conversation:unsubscribe", { id_conversation: conversationId })
      if (readTimer) {
        // Sair da thread com leitura pendente: grava agora (sem esperar o debounce).
        clearTimeout(readTimer)
        readTimer = null
        void postDirectRead(token, conversationId, actorId).then(() => window.dispatchEvent(new Event("mensagens:unread-changed")))
      }
    }
  }, [token, conversationId, actorId, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  /** true = enviada (o campo limpa só aí). */
  const send = useCallback(
    async (raw: string) => {
      const text = cleanDraft(raw, DIRECT_MAX)
      if (!text || !token || !conversationId || !actorId) return false
      const clientId = newClientId()
      setError(null)
      setItems((cur) => mergeLines(cur, [{ ...pendingLine(clientId, text), kind: "text" } as DmMessage]) as DmMessage[])
      const r = await postDirectMessage(token, conversationId, actorId, text, clientId)
      if (r.ok) setItems((cur) => confirmLine(cur, clientId, r.data.message) as DmMessage[])
      else {
        setItems((cur) => dropPending(cur, clientId) as DmMessage[])
        setError(r.status === 0 ? "network" : r.error)
      }
      return r.ok
    },
    [token, conversationId, actorId],
  )

  return { items, loading, error, send, retry }
}
