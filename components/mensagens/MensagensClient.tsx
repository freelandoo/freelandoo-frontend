"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  MessageCircle,
  Send,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getToken } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import type {
  ConversationDetail,
  ConversationListItem,
  MensagensActor,
  MessageItem,
} from "./types"

const ACTOR_STORAGE_KEY = "mensagens:active_actor"
const POLL_THREAD_MS = 5000
const POLL_LIST_MS = 15000

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      ...authHeaders(),
    },
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
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) || `Erro ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

function formatTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return d.toLocaleDateString("pt-BR", { weekday: "short" })
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const today = dayKey(now.toISOString())
  const yesterday = new Date(now.getTime() - 86_400_000)
  if (dayKey(iso) === today) return "Hoje"
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Ontem"
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return d.toLocaleDateString("pt-BR", { weekday: "long" })
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
}

function entityInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] || ""
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (a + b).toUpperCase() || "?"
}

interface ActorsResponse {
  actors: MensagensActor[]
}

interface ConversationsListResponse {
  items: ConversationListItem[]
  next_cursor: string | null
  has_more: boolean
}

interface MessagesListResponse {
  items: MessageItem[]
  next_cursor: string | null
  has_more: boolean
}

interface OpenResponse {
  conversation: { id_conversation: string; other_entity_id?: string }
  created: boolean
  actor: MensagensActor | null
  other_entity: MensagensActor | null
}

interface DetailResponse {
  conversation: ConversationDetail
  actor: MensagensActor | null
  other_entity: MensagensActor | null
}

interface SendResponse {
  message: MessageItem
  conversation: { id_conversation: string; other_entity_id: string | null }
}

export default function MensagensClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()

  const initialConvId = searchParams.get("c")
  const initialOpenWith = searchParams.get("with")
  const initialOpenAs = searchParams.get("as")

  const [actors, setActors] = useState<MensagensActor[]>([])
  const [actorId, setActorId] = useState<string | null>(null)
  const [actorsLoading, setActorsLoading] = useState(true)

  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [convsLoading, setConvsLoading] = useState(false)
  const [convsError, setConvsError] = useState<string | null>(null)

  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId)
  const [activeDetail, setActiveDetail] = useState<DetailResponse | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messagesError, setMessagesError] = useState<string | null>(null)

  const [composer, setComposer] = useState("")
  const [sending, setSending] = useState(false)

  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const lastMsgIdRef = useRef<string | null>(null)

  const activeActor = useMemo(
    () => actors.find((a) => a.id === actorId) || null,
    [actors, actorId]
  )

  // Carrega atores
  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    setActorsLoading(true)
    jsonFetch<ActorsResponse>("/api/entity-follows/actors")
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data?.actors) ? data.actors : []
        setActors(list)
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(ACTOR_STORAGE_KEY)
            : null
        const fromQuery =
          initialOpenAs && list.find((a) => a.id === initialOpenAs)?.id
        const fromStorage = stored && list.find((a) => a.id === stored)?.id
        const next = fromQuery || fromStorage || list[0]?.id || null
        setActorId(next)
      })
      .catch(() => {
        if (!cancelled) setActors([])
      })
      .finally(() => {
        if (!cancelled) setActorsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [status, initialOpenAs])

  // Persiste actor selecionado
  useEffect(() => {
    if (typeof window === "undefined" || !actorId) return
    localStorage.setItem(ACTOR_STORAGE_KEY, actorId)
  }, [actorId])

  // Auto-abre conversa via ?with=&as=
  useEffect(() => {
    if (!actorId || !initialOpenWith) return
    if (activeConvId) return
    let cancelled = false
    jsonFetch<OpenResponse>("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actor_id: actorId,
        actor_type: activeActor?.type || "profile",
        target_id: initialOpenWith,
      }),
    })
      .then((data) => {
        if (cancelled) return
        const id = data?.conversation?.id_conversation
        if (id) {
          setActiveConvId(id)
          // limpa query string para evitar re-trigger
          const params = new URLSearchParams(searchParams.toString())
          params.delete("with")
          params.delete("as")
          params.set("c", id)
          router.replace(`/mensagens?${params.toString()}`)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [actorId, initialOpenWith, activeConvId, activeActor?.type, router, searchParams])

  const loadConversations = useCallback(async () => {
    if (!actorId) return
    setConvsLoading(true)
    setConvsError(null)
    try {
      const data = await jsonFetch<ConversationsListResponse>(
        `/api/conversations?actor_id=${encodeURIComponent(actorId)}&actor_type=${encodeURIComponent(activeActor?.type || "profile")}`
      )
      setConversations(Array.isArray(data?.items) ? data.items : [])
    } catch (err) {
      setConvsError((err as Error).message || "Erro ao carregar conversas")
      setConversations([])
    } finally {
      setConvsLoading(false)
    }
  }, [actorId, activeActor?.type])

  // Carrega lista quando muda actor
  useEffect(() => {
    if (!actorId) return
    loadConversations()
  }, [actorId, loadConversations])

  // Polling da lista
  useEffect(() => {
    if (!actorId) return
    const t = setInterval(loadConversations, POLL_LIST_MS)
    return () => clearInterval(t)
  }, [actorId, loadConversations])

  const loadThread = useCallback(
    async (convId: string, opts?: { silent?: boolean }) => {
      if (!actorId || !convId) return
      if (!opts?.silent) {
        setMessagesLoading(true)
        setMessagesError(null)
      }
      try {
        const qs = `?actor_id=${encodeURIComponent(actorId)}&actor_type=${encodeURIComponent(activeActor?.type || "profile")}`
        const [detail, msgs] = await Promise.all([
          jsonFetch<DetailResponse>(`/api/conversations/${convId}${qs}`),
          jsonFetch<MessagesListResponse>(`/api/conversations/${convId}/messages${qs}`),
        ])
        setActiveDetail(detail)
        const items = Array.isArray(msgs?.items) ? msgs.items.slice().reverse() : []
        setMessages(items)
        const last = items[items.length - 1]?.id_message || null
        if (last !== lastMsgIdRef.current) {
          lastMsgIdRef.current = last
        }
        // marca como lido se há unread
        if (detail?.conversation?.unread_count > 0) {
          jsonFetch(`/api/conversations/${convId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              actor_id: actorId,
              actor_type: activeActor?.type || "profile",
            }),
          })
            .then(() => {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id_conversation === convId ? { ...c, unread_count: 0 } : c
                )
              )
              window.dispatchEvent(new Event("mensagens:unread-changed"))
            })
            .catch(() => {})
        }
      } catch (err) {
        if (!opts?.silent) {
          setMessagesError((err as Error).message || "Erro ao carregar mensagens")
        }
      } finally {
        if (!opts?.silent) setMessagesLoading(false)
      }
    },
    [actorId, activeActor?.type]
  )

  // Carrega thread quando muda activeConv
  useEffect(() => {
    if (!activeConvId) return
    loadThread(activeConvId)
  }, [activeConvId, loadThread])

  // Polling da thread
  useEffect(() => {
    if (!activeConvId) return
    const t = setInterval(() => loadThread(activeConvId, { silent: true }), POLL_THREAD_MS)
    return () => clearInterval(t)
  }, [activeConvId, loadThread])

  // Auto scroll quando chega nova mensagem
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  const handleSelectActor = useCallback((id: string) => {
    setActorId(id)
    setActiveConvId(null)
    setActiveDetail(null)
    setMessages([])
    setComposer("")
  }, [])

  const handleSelectConv = useCallback((id: string) => {
    setActiveConvId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set("c", id)
    router.replace(`/mensagens?${params.toString()}`)
  }, [router, searchParams])

  const handleBackToList = useCallback(() => {
    setActiveConvId(null)
    setActiveDetail(null)
    setMessages([])
    const params = new URLSearchParams(searchParams.toString())
    params.delete("c")
    const qs = params.toString()
    router.replace(qs ? `/mensagens?${qs}` : "/mensagens")
  }, [router, searchParams])

  const handleSend = useCallback(async () => {
    const body = composer.trim()
    if (!body || !actorId || !activeConvId || sending) return
    setSending(true)
    try {
      const data = await jsonFetch<SendResponse>(
        `/api/conversations/${activeConvId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: actorId,
            actor_type: activeActor?.type || "profile",
            body,
          }),
        }
      )
      setComposer("")
      if (data?.message) {
        setMessages((prev) => [...prev, data.message])
      }
      // refresh otimista da lista
      loadConversations()
    } catch (err) {
      setMessagesError((err as Error).message || "Erro ao enviar")
    } finally {
      setSending(false)
    }
  }, [composer, actorId, activeConvId, sending, activeActor?.type, loadConversations])

  if (status === "loading") {
    return (
      <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-white/10 bg-neutral-900/60 p-8 text-center">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="mb-2 text-xl font-semibold text-white">
            Entre para ver suas mensagens
          </h1>
          <p className="mb-5 text-sm text-white/60">
            Você precisa estar logado para usar a caixa de mensagens.
          </p>
          <Link href="/login">
            <Button>Fazer login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto min-h-[calc(100dvh-72px)] px-0 md:px-4 md:py-6">
      <div className="grid h-[calc(100dvh-72px)] grid-cols-1 overflow-hidden border-y border-white/[0.07] bg-gradient-to-b from-neutral-950 to-neutral-900/80 md:h-[calc(100dvh-120px)] md:grid-cols-[340px_1fr] md:rounded-2xl md:border md:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
        {/* Lista de conversas */}
        <aside
          className={cn(
            "flex flex-col border-r border-white/10",
            activeConvId ? "hidden md:flex" : "flex"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3.5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-white">
                Mensagens
              </h2>
              <p className="text-[11px] text-white/40">Suas conversas</p>
            </div>
            <ActorSelector
              actors={actors}
              actorId={actorId}
              loading={actorsLoading}
              onSelect={handleSelectActor}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {convsLoading && conversations.length === 0 ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : convsError ? (
              <div className="p-6 text-center text-sm text-red-400">{convsError}</div>
            ) : conversations.length === 0 ? (
              <EmptyConversations />
            ) : (
              <ul className="divide-y divide-white/5">
                {conversations.map((c) => (
                  <li key={c.id_conversation}>
                    <button
                      onClick={() => handleSelectConv(c.id_conversation)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5",
                        activeConvId === c.id_conversation && "bg-white/5"
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={c.other_entity?.avatar_url || undefined} />
                        <AvatarFallback className="bg-neutral-800 text-xs text-white">
                          {entityInitials(c.other_entity?.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-white">
                            {c.other_entity?.display_name || "Sem nome"}
                          </span>
                          <span className="shrink-0 text-[10px] text-white/40">
                            {formatTime(c.last_message_at || c.created_at)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={cn(
                            "truncate text-xs",
                            c.unread_count > 0 ? "text-white" : "text-white/50"
                          )}>
                            {c.is_last_message_from_me ? "Você: " : ""}
                            {c.last_message_preview || "Sem mensagens ainda"}
                          </span>
                          {c.unread_count > 0 && (
                            <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                              {c.unread_count > 99 ? "99+" : c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section
          className={cn(
            "flex min-w-0 flex-col",
            activeConvId ? "flex" : "hidden md:flex"
          )}
        >
          {!activeConvId ? (
            <EmptyThread />
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-white/[0.07] bg-black/20 px-4 py-3 backdrop-blur">
                <button
                  onClick={handleBackToList}
                  className="text-white/60 hover:text-white md:hidden"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={activeDetail?.other_entity?.avatar_url || undefined} />
                  <AvatarFallback className="bg-neutral-800 text-xs text-white">
                    {entityInitials(activeDetail?.other_entity?.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {activeDetail?.other_entity?.display_name || "Conversa"}
                  </div>
                  <div className="truncate text-[11px] text-white/50">
                    {activeDetail?.other_entity?.type === "clan" ? "Clan" : "Subperfil"}
                    {activeDetail?.other_entity?.username
                      ? ` · @${activeDetail.other_entity.username}`
                      : ""}
                  </div>
                </div>
                {activeDetail?.other_entity?.sub_profile_slug && activeDetail?.other_entity?.username ? (
                  <Link
                    href={
                      activeDetail.other_entity.type === "clan"
                        ? `/clans/${activeDetail.other_entity.id}`
                        : `/p/${activeDetail.other_entity.username}/${activeDetail.other_entity.sub_profile_slug}`
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    Ver perfil
                  </Link>
                ) : null}
              </header>

              <div className="flex-1 overflow-y-auto px-4 py-4">
                {messagesLoading && messages.length === 0 ? (
                  <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                      <Skeleton key={i} className="h-12 w-3/4 rounded-2xl" />
                    ))}
                  </div>
                ) : messagesError ? (
                  <div className="text-center text-sm text-red-400">{messagesError}</div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-sm text-white/40">
                    <MessageCircle className="mb-2 h-8 w-8" />
                    Comece a conversa.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {messages.map((m, idx) => {
                      const mine = m.sender_entity_id === actorId
                      const prev = messages[idx - 1]
                      const showDay =
                        !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
                      const sameSenderAsPrev =
                        !!prev && prev.sender_entity_id === m.sender_entity_id && !showDay
                      return (
                        <div key={m.id_message}>
                          {showDay && (
                            <div className="my-4 flex items-center gap-3">
                              <div className="h-px flex-1 bg-white/5" />
                              <span className="text-[10px] uppercase tracking-wider text-white/40">
                                {dayLabel(m.created_at)}
                              </span>
                              <div className="h-px flex-1 bg-white/5" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "flex",
                              mine ? "justify-end" : "justify-start",
                              sameSenderAsPrev ? "mt-0.5" : "mt-2"
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words transition-colors",
                                mine
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-neutral-800/90 text-white",
                                mine
                                  ? sameSenderAsPrev
                                    ? "rounded-2xl rounded-br-md"
                                    : "rounded-2xl rounded-br-sm"
                                  : sameSenderAsPrev
                                    ? "rounded-2xl rounded-bl-md"
                                    : "rounded-2xl rounded-bl-sm"
                              )}
                            >
                              {m.body}
                              <span
                                className={cn(
                                  "ml-2 text-[10px] tabular-nums",
                                  mine ? "text-primary-foreground/70" : "text-white/50"
                                )}
                              >
                                {formatTime(m.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div ref={threadEndRef} />
              </div>

              <div className="border-t border-white/10 px-3 py-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={composer}
                    onChange={(e) => setComposer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder="Escrever mensagem"
                    rows={1}
                    className="min-h-[40px] max-h-32 resize-none border-white/10 bg-neutral-900 text-sm text-white placeholder:text-white/40"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !composer.trim()}
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    aria-label="Enviar"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function ActorSelector({
  actors,
  actorId,
  loading,
  onSelect,
}: {
  actors: MensagensActor[]
  actorId: string | null
  loading: boolean
  onSelect: (id: string) => void
}) {
  const active = actors.find((a) => a.id === actorId)
  if (loading) {
    return <Skeleton className="h-7 w-32 rounded-md" />
  }
  if (actors.length === 0) {
    return (
      <span className="text-[11px] text-white/40">
        Sem subperfis ativos
      </span>
    )
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800">
          <Avatar className="h-5 w-5">
            <AvatarImage src={active?.avatar_url || undefined} />
            <AvatarFallback className="bg-neutral-800 text-[9px]">
              {entityInitials(active?.display_name)}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-[100px] truncate">
            {active?.display_name || "Selecionar"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-white/40">
          Atuar como
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actors.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onClick={() => onSelect(a.id)}
            className="cursor-pointer"
          >
            <Avatar className="mr-2 h-5 w-5">
              <AvatarImage src={a.avatar_url || undefined} />
              <AvatarFallback className="bg-neutral-800 text-[9px]">
                {entityInitials(a.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="flex-1 truncate text-sm">
              {a.display_name || "Sem nome"}
            </span>
            {a.type === "clan" ? (
              <Users className="ml-1 h-3.5 w-3.5 text-white/40" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyConversations() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <MessageCircle className="mb-3 h-10 w-10 text-white/30" />
      <p className="text-sm font-medium text-white">Nenhuma conversa</p>
      <p className="mt-1 text-xs text-white/50">
        Abra um perfil e clique em &ldquo;Enviar mensagem&rdquo; para começar.
      </p>
    </div>
  )
}

function EmptyThread() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/40">
      <MessageCircle className="mb-3 h-12 w-12" />
      <p className="text-sm">Selecione uma conversa para ler.</p>
    </div>
  )
}
