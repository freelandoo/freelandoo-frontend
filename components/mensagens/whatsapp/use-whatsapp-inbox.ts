"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"

/**
 * O estado da caixa do WhatsApp (mig 223): status da conexão, conversas,
 * thread aberta e envio.
 *
 * ─── POR QUE UM HOOK, E NÃO ESTADO DENTRO DE CADA COMPONENTE ────────────────
 *
 * A aba WhatsApp ocupa as DUAS colunas de /mensagens (a lista à esquerda, a
 * conversa à direita), e essas colunas são irmãs no layout, não pai e filho.
 * Estado duplicado nas duas faria a lista mostrar uma coisa e a conversa outra
 * — que é o que acontece quando alguém escreve a mesma leitura duas vezes.
 * Ele é chamado UMA vez no MensagensClient e desce para os dois lados.
 *
 * ─── `enabled`: NADA É BUSCADO ANTES DE ABRIR A ABA ─────────────────────────
 *
 * O hook é sempre chamado (rules-of-hooks), mas só vai à rede quando a aba
 * WhatsApp está na tela. A maioria das visitas a /mensagens não abre esta aba,
 * e cobrar a requisição de todas elas seria pagar por quem não pediu — a mesma
 * disciplina do `onOpen` da gaveta de números.
 *
 * ─── PUSH, NÃO POLLING ──────────────────────────────────────────────────────
 *
 * A caixa se atualiza pelo socket (`whatsapp:message`, `whatsapp:status`), que
 * o backend emite ao processar o webhook. A ÚNICA exceção é o modal do QR, que
 * pergunta o status de tempos em tempos — ali existe um evento externo (o dedo
 * da pessoa no celular) que não passa por nós, e a espera dura segundos.
 */

export type WhatsappStatus = "disconnected" | "connecting" | "connected"

export interface WhatsappStatusInfo {
  configured: boolean
  exists: boolean
  status: WhatsappStatus
  number: string
  /**
   * Por que a sessão caiu: 'user' (a pessoa desligou) ou 'idle' (o sweeper
   * desligou por inatividade). Sem isso, quem volta depois de um mês encontra
   * o botão "Conectar" e conclui que o produto quebrou.
   */
  disconnect_reason?: "user" | "idle" | null
  /** Dias de inatividade que derrubam a sessão — o número vem do backend. */
  idle_days?: number
  unread?: number
}

export interface WhatsappConversation {
  id_conversation: string
  phone: string
  phone_display: string
  title: string
  is_group: boolean
  unread_count: number
  last_message_at: string
  last_message_preview: string
}

export interface WhatsappMessage {
  id_message: string | null
  wa_message_id: string | null
  direction: "in" | "out"
  sender_label: string | null
  body: string
  media_type: "text" | "image" | "audio" | "video" | "document" | "other"
  sent_at: string
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}), ...authHeaders() },
    cache: "no-store",
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Erro ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export function useWhatsappInbox(enabled: boolean) {
  const [info, setInfo] = useState<WhatsappStatusInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(false)

  const [conversations, setConversations] = useState<WhatsappConversation[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<WhatsappMessage[]>([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  // `activeId` dentro do listener do socket sem re-inscrever a cada troca de
  // conversa: sem o ref, a inscrição seria refeita a cada clique da pessoa.
  const activeRef = useRef<string | null>(null)
  activeRef.current = activeId

  const loadStatus = useCallback(async () => {
    setInfoLoading(true)
    try {
      setInfo(await api<WhatsappStatusInfo>("/api/whatsapp/instance"))
    } catch {
      // Status é informativo: falhar aqui não pode apagar a caixa da tela.
    } finally {
      setInfoLoading(false)
    }
  }, [])

  const loadConversations = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ""
      const r = await api<{ conversations: WhatsappConversation[] }>(`/api/whatsapp/conversations${q}`)
      setConversations(Array.isArray(r.conversations) ? r.conversations : [])
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Falha ao carregar as conversas.")
    } finally {
      setListLoading(false)
    }
  }, [search])

  const openConversation = useCallback(async (id: string) => {
    setActiveId(id)
    setThreadLoading(true)
    setThreadError(null)
    try {
      const r = await api<{ messages: WhatsappMessage[] }>(
        `/api/whatsapp/conversations/${id}/messages`
      )
      setMessages(Array.isArray(r.messages) ? r.messages : [])
      // Abrir é ler: o backend já zerou o contador, e a lista tem que
      // acompanhar sem esperar uma nova busca.
      setConversations((prev) =>
        prev.map((c) => (c.id_conversation === id ? { ...c, unread_count: 0 } : c))
      )
    } catch (e) {
      setThreadError(e instanceof Error ? e.message : "Falha ao abrir a conversa.")
    } finally {
      setThreadLoading(false)
    }
  }, [])

  const closeConversation = useCallback(() => {
    setActiveId(null)
    setMessages([])
  }, [])

  const send = useCallback(
    async (text: string) => {
      const id = activeRef.current
      const body = text.trim()
      if (!id || !body || sending) return
      setSending(true)
      try {
        const r = await api<{ message: WhatsappMessage }>(
          `/api/whatsapp/conversations/${id}/messages`,
          { method: "POST", body: JSON.stringify({ text: body }) }
        )
        setMessages((prev) => [...prev, r.message])
        setConversations((prev) =>
          prev
            .map((c) =>
              c.id_conversation === id
                ? { ...c, last_message_preview: body, last_message_at: r.message.sent_at }
                : c
            )
            .sort((a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at))
        )
      } catch (e) {
        setThreadError(e instanceof Error ? e.message : "Falha ao enviar.")
        throw e
      } finally {
        setSending(false)
      }
    },
    [sending]
  )

  /** Primeira carga — só quando a aba entra na tela. */
  useEffect(() => {
    if (!enabled) return
    void loadStatus()
  }, [enabled, loadStatus])

  useEffect(() => {
    if (!enabled) return
    void loadConversations()
  }, [enabled, loadConversations])

  /** O que chega pelo webhook, empurrado pelo backend. */
  useEffect(() => {
    if (!enabled) return
    const offMessage = onRealtime("whatsapp:message", (payload) => {
      const p = payload as {
        id_conversation: string
        message: WhatsappMessage
        conversation: Partial<WhatsappConversation> & { id_conversation: string }
      }
      if (!p || !p.id_conversation) return

      // Na conversa aberta, a mensagem entra na hora. Fora dela, só a lista
      // muda — trazer a thread inteira de uma conversa que ninguém está
      // olhando gastaria uma requisição por mensagem recebida.
      if (activeRef.current === p.id_conversation && p.message) {
        setMessages((prev) =>
          prev.some(
            (m) => p.message.wa_message_id && m.wa_message_id === p.message.wa_message_id
          )
            ? prev
            : [...prev, p.message]
        )
      }

      setConversations((prev) => {
        const known = prev.find((c) => c.id_conversation === p.id_conversation)
        const isOpen = activeRef.current === p.id_conversation
        const updated: WhatsappConversation = known
          ? {
              ...known,
              last_message_preview: p.conversation?.last_message_preview ?? known.last_message_preview,
              last_message_at: p.conversation?.last_message_at ?? known.last_message_at,
              unread_count:
                isOpen || p.message?.direction === "out" ? 0 : (known.unread_count || 0) + 1,
            }
          : {
              id_conversation: p.id_conversation,
              phone: p.conversation?.phone || "",
              phone_display: p.conversation?.phone_display || "",
              title: p.conversation?.title || p.conversation?.phone_display || "",
              is_group: !!p.conversation?.is_group,
              unread_count: isOpen ? 0 : 1,
              last_message_at: p.conversation?.last_message_at || new Date().toISOString(),
              last_message_preview: p.conversation?.last_message_preview || "",
            }
        const rest = prev.filter((c) => c.id_conversation !== p.id_conversation)
        return [updated, ...rest].sort(
          (a, b) => +new Date(b.last_message_at) - +new Date(a.last_message_at)
        )
      })
    })

    const offStatus = onRealtime("whatsapp:status", (payload) => {
      const p = payload as {
        status: WhatsappStatus
        number: string
        disconnect_reason?: "user" | "idle" | null
      }
      if (!p || !p.status) return
      setInfo((prev) =>
        prev
          ? {
              ...prev,
              exists: true,
              status: p.status,
              number: p.number || prev.number,
              disconnect_reason: p.status === "connected" ? null : p.disconnect_reason ?? prev.disconnect_reason,
            }
          : prev
      )
      // Conectou agora: a caixa pode ter conversas que chegaram enquanto a
      // sessão estava fora.
      if (p.status === "connected") void loadConversations()
    })

    return () => {
      offMessage()
      offStatus()
    }
  }, [enabled, loadConversations])

  return {
    info,
    infoLoading,
    conversations,
    listLoading,
    listError,
    search,
    setSearch,
    activeId,
    messages,
    threadLoading,
    threadError,
    sending,
    openConversation,
    closeConversation,
    send,
    reloadStatus: loadStatus,
    reloadConversations: loadConversations,
    setInfo,
  }
}

export type WhatsappInbox = ReturnType<typeof useWhatsappInbox>
