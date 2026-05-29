"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, MessageSquare, AlertCircle } from "lucide-react"
import { PageShell, TabloidPageIntro } from "@/components/tabloide"

interface MinorConversation {
  id_conversation: string
  last_message_at: string | null
  last_message_preview: string | null
  last_message_sender_entity_id: string | null
  minor_entity_id: string
  other_entity_id: string
  minor_display_name: string | null
  minor_avatar_url: string | null
  other_display_name: string | null
  other_avatar_url: string | null
  other_username: string | null
}

interface SupervisedMessage {
  id_message: string
  id_conversation: string
  sender_entity_id: string
  sender_user_id: string
  body: string
  created_at: string
  sender_display_name: string | null
  sender_avatar_url: string | null
}

function authHeaders(): HeadersInit {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function formatTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function MinorMessagesPage() {
  const params = useParams<{ minor_user_id: string }>()
  const router = useRouter()
  const minorUserId = params?.minor_user_id

  const [conversations, setConversations] = useState<MinorConversation[]>([])
  const [selected, setSelected] = useState<MinorConversation | null>(null)
  const [messages, setMessages] = useState<SupervisedMessage[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    if (!minorUserId) return
    setLoadingList(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/supervision/minors/${minorUserId}/conversations`,
        { headers: authHeaders(), cache: "no-store" }
      )
      if (res.status === 401) {
        router.push("/login")
        return
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Falha ao carregar")
      setConversations(data.conversations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado")
    } finally {
      setLoadingList(false)
    }
  }, [minorUserId, router])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const openConversation = async (conv: MinorConversation) => {
    if (!minorUserId) return
    setSelected(conv)
    setLoadingMessages(true)
    setMessages([])
    try {
      const res = await fetch(
        `/api/supervision/minors/${minorUserId}/conversations/${conv.id_conversation}/messages`,
        { headers: authHeaders(), cache: "no-store" }
      )
      const data = await res.json()
      if (res.ok) {
        setMessages(data.messages || [])
      } else {
        setError(data?.error || "Falha ao carregar mensagens")
      }
    } finally {
      setLoadingMessages(false)
    }
  }

  return (
    <PageShell className="tabloid-account-page md:pl-[80px]">
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10">
        <TabloidPageIntro
          eyebrow="Somente leitura"
          title="MENSAGENS."
          subtitle="Visualização supervisionada das conversas do menor, com lista e transcript no mesmo painel editorial."
          back={
            <button
              type="button"
              onClick={() => router.push("/account/parental")}
              className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-[#9A938A] transition hover:text-[#F5F1E8]"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          }
          className="mb-8"
        />

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-[6px] border-2 border-red-500/30 bg-red-500/5 p-3 text-sm font-bold text-red-500">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          {/* Lista de conversas */}
          <Card className="fl-card-dark h-fit rounded-2xl border-[#F5F1E8]/20 bg-[#1D1810] text-[#F5F1E8]">
            <CardHeader>
              <CardTitle className="text-base">Conversas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {loadingList && (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              )}
              {!loadingList && conversations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  O menor ainda não trocou mensagens.
                </p>
              )}
              {conversations.map((conv) => {
                const isSelected = selected?.id_conversation === conv.id_conversation
                return (
                  <button
                    key={conv.id_conversation}
                    type="button"
                    onClick={() => openConversation(conv)}
                    className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition ${
                      isSelected ? "bg-amber-500/10" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      {conv.other_avatar_url && (
                        <AvatarImage src={conv.other_avatar_url} />
                      )}
                      <AvatarFallback>
                        {(conv.other_display_name || "?").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {conv.other_display_name || "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.last_message_preview || "Sem mensagens"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatTime(conv.last_message_at)}
                    </span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Mensagens da conversa */}
          <Card className="fl-card-dark rounded-2xl border-[#F5F1E8]/20 bg-[#1D1810] text-[#F5F1E8]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                {selected
                  ? `Conversa com ${selected.other_display_name || "—"}`
                  : "Selecione uma conversa"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selected && (
                <p className="text-sm text-muted-foreground">
                  Clique em uma conversa à esquerda para ver as mensagens.
                </p>
              )}
              {loadingMessages && (
                <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
              )}
              {!loadingMessages && selected && messages.length === 0 && (
                <p className="text-sm text-muted-foreground">Conversa vazia.</p>
              )}
              <div className="space-y-3">
                {messages.map((msg) => {
                  const fromMinor = msg.sender_entity_id === selected?.minor_entity_id
                  return (
                    <div
                      key={msg.id_message}
                      className={`flex gap-2 ${fromMinor ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          fromMinor
                            ? "bg-amber-500/20 text-amber-50"
                            : "bg-white/[0.04] text-white/90"
                        }`}
                      >
                        <p className="mb-1 text-[10px] text-white/50">
                          {msg.sender_display_name || "—"} · {formatTime(msg.created_at)}
                        </p>
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </PageShell>
  )
}
