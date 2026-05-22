"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ChevronDown,
  ClipboardList,
  Lock,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { ChatRoomPanel, type ChatMachine } from "@/components/mensagens/ChatRoomPanel"
import { CreateGroupModal } from "@/components/mensagens/CreateGroupModal"
import { EmojiPickerButton } from "@/components/mensagens/EmojiPickerButton"
import { OfferingPickerButton } from "@/components/mensagens/OfferingPickerButton"
import { AudioMessage, AudioRecorder } from "@/components/mensagens/AudioRecorder"
import { MarkdownText } from "@/components/ui/markdown-text"
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
import { emitRealtime, onRealtime } from "@/lib/realtime"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import type {
  ConversationDetail,
  ConversationListItem,
  MensagensActor,
  MessageItem,
} from "./types"

const ACTOR_STORAGE_KEY = "mensagens:active_actor"
// Realtime (WS) cobre o caso comum: conversation:message empurra updates
// na hora. Polling é só safety net pra detectar reconexão silenciosa.
// Antes 45s/120s gerava ~300 calls/h/user logado em /mensagens.
const POLL_THREAD_MS = 300_000   // 5 min
const POLL_LIST_MS = 600_000     // 10 min
const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 }

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

function formatTime(iso: string | null, locale: string = "pt-BR"): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return d.toLocaleDateString(locale, { weekday: "short" })
  }
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(
  iso: string,
  t: (key: string, fallback?: string) => string,
  locale: string = "pt-BR"
): string {
  const d = new Date(iso)
  const now = new Date()
  const today = dayKey(now.toISOString())
  const yesterday = new Date(now.getTime() - 86_400_000)
  if (dayKey(iso) === today) return t("todayLabel", "Hoje")
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return t("yesterdayLabel", "Ontem")
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return d.toLocaleDateString(locale, { weekday: "long" })
  }
  return d.toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })
}

function entityInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] || ""
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (a + b).toUpperCase() || "?"
}

function entityHref(entity: {
  type?: string | null
  id?: string | null
  username?: string | null
  sub_profile_slug?: string | null
} | null | undefined): string | null {
  if (!entity) return null
  if (entity.type === "clan" && entity.id) return `/clans/${entity.id}`
  if (entity.username && entity.sub_profile_slug) {
    return `/p/${entity.username}/${entity.sub_profile_slug}`
  }
  if (entity.id) return `/freelancer/${entity.id}`
  return null
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

type MainTab = "conv" | "os" | "global" | "machine"

interface OsChatRequest {
  id_request: string
  status: string
  description: string
  estado: string | null
  municipio: string | null
  id_machine: number
  id_category: number
  machine_name: string | null
  category_name: string | null
  id_response_chosen: string | null
}

interface OsChatProfile {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  sub_profile_slug: string | null
  username: string | null
  is_clan: boolean
}

/** Detalhe read-only de uma solicitação de produto (produto não tem chat-thread). */
interface ProductSolicitacaoInfo {
  title: string
  description: string
  city: string | null
  state: string | null
  category_name: string | null
  status: string
  /** Mensagem/proposta do vendedor (lado vendedor) ou null. */
  seller_message: string | null
  proposed_price_cents: number | null
}

interface OsChatItem {
  id_response: string
  response_status: string
  response_created_at: string
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  request: OsChatRequest
  profile: OsChatProfile
  /** Tipo da solicitação. Roteia endpoints / comportamento de clique. */
  kind?: "service" | "course" | "product"
  /** Lado: 'user' = eu pedi · 'pro' = eu respondi. */
  side?: "user" | "pro"
  /** Presente só quando kind === 'product' (item read-only). */
  productInfo?: ProductSolicitacaoInfo
}

interface OsChatsListResponse { chats: OsChatItem[] }

interface ProductBuyerRequest {
  id_product_request: string
  title: string
  description: string
  city: string | null
  state: string | null
  status: string
  category_name: string | null
  created_at: string
  updated_at: string | null
}

interface ProductSellerResponse {
  id_response: string
  id_product_request: string
  message: string
  proposed_price_cents: number | null
  status: string
  created_at: string
  updated_at: string | null
  request_title: string
  request_description: string
  request_city: string | null
  request_state: string | null
  request_status: string
  category_name: string | null
  buyer_username: string | null
}

interface OsMessageItem {
  id_message: string
  id_response: string
  sender: "USER" | "PRO"
  content: string
  created_at: string
}

interface OsMessagesResponse {
  messages: OsMessageItem[]
  side: "USER" | "PRO"
  response: { id_response: string; status: string }
}

const OS_TERMINAL_STATUS = new Set([
  "USER_REJECTED",
  "PRO_REJECTED",
  "FINALIZED",
  "CLOSED_OTHER_WON",
])

const OS_STATUS_I18N: Record<string, { key: string; fallback: string }> = {
  PENDING:          { key: "osStatusPending",       fallback: "Aguardando" },
  PRO_ACCEPTED:     { key: "osStatusAccepted",      fallback: "Profissional aceitou" },
  FINALIZED:        { key: "osStatusFinalized",     fallback: "Finalizada" },
  USER_REJECTED:    { key: "osStatusUserRejected",  fallback: "Você rejeitou" },
  PRO_REJECTED:     { key: "osStatusProRejected",   fallback: "Profissional rejeitou" },
  CLOSED_OTHER_WON: { key: "osStatusOtherWon",      fallback: "Outro profissional foi escolhido" },
  OPEN:             { key: "osStatusOpen",          fallback: "Aberta" },
  FULFILLED:        { key: "osStatusFulfilled",     fallback: "Encerrada" },
  CANCELED:         { key: "osStatusCanceled",      fallback: "Cancelada" },
}

function osStatusLabel(status: string, t?: (key: string, fallback?: string) => string): string {
  const m = OS_STATUS_I18N[status]
  if (!m) return status
  return t ? t(m.key, m.fallback) : m.fallback
}

export default function MensagensClient() {
  const t = useTranslations("Messages")
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useAuth()

  const initialConvId = searchParams.get("c")
  const initialOpenWith = searchParams.get("with")
  const initialOpenAs = searchParams.get("as")
  const initialActorId = searchParams.get("actor") || initialOpenAs
  const tabParam = searchParams.get("tab")
  const initialTab: MainTab =
    tabParam === "os" ? "os" :
    tabParam === "global" ? "global" :
    tabParam === "machine" ? "machine" :
    "conv"
  const initialOsResponseId = searchParams.get("response")

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
  const [audioRecorderActive, setAudioRecorderActive] = useState(false)

  // Search inline para encontrar perfis/clans pra começar nova conversa.
  const [convSearch, setConvSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    type: "profile" | "clan"
    display_name: string | null
    avatar_url: string | null
    sub_profile_slug: string | null
    is_clan: boolean
    is_user_account: boolean
    username: string | null
  }>>([])
  const [searchLoading, setSearchLoading] = useState(false)

  // ----- Aba O.S. -----
  const [tab, setTab] = useState<MainTab>(initialTab)
  const [osChats, setOsChats] = useState<OsChatItem[]>([])
  const [osChatsLoading, setOsChatsLoading] = useState(false)
  const [osChatsError, setOsChatsError] = useState<string | null>(null)
  const [activeOsResponseId, setActiveOsResponseId] = useState<string | null>(initialOsResponseId)
  const [osMessages, setOsMessages] = useState<OsMessageItem[]>([])
  const [osMessagesLoading, setOsMessagesLoading] = useState(false)
  const [osMessagesError, setOsMessagesError] = useState<string | null>(null)
  const [osCurrentStatus, setOsCurrentStatus] = useState<string>("")
  const [osViewerSide, setOsViewerSide] = useState<"USER" | "PRO">("USER")
  const [osComposer, setOsComposer] = useState("")
  const [osSending, setOsSending] = useState(false)
  const [productDetail, setProductDetail] = useState<OsChatItem | null>(null)
  const osThreadEndRef = useRef<HTMLDivElement | null>(null)

  // ----- Chat ao vivo (Global / Enxames) -----
  const initialMachineId = searchParams.get("machine_id")
  const [chatMachineId, setChatMachineId] = useState<number | null>(
    initialMachineId ? Number(initialMachineId) || null : null
  )
  const [userMachines, setUserMachines] = useState<ChatMachine[]>([])
  const [allMachines, setAllMachines] = useState<ChatMachine[]>([])
  const [machinesLoaded, setMachinesLoaded] = useState(false)
  const [machinesLoading, setMachinesLoading] = useState(false)
  const [, setNeedsMachinePick] = useState(false)

  const threadEndRef = useRef<HTMLDivElement | null>(null)
  const lastMsgIdRef = useRef<string | null>(null)

  // ----- Criar grupo -----
  const [createGroupOpen, setCreateGroupOpen] = useState(false)

  const activeActor = useMemo(
    () => actors.find((a) => a.id === actorId) || null,
    [actors, actorId]
  )

  const activeConv = useMemo(
    () => conversations.find((c) => c.id_conversation === activeConvId) || null,
    [conversations, activeConvId]
  )

  // Áudio só em conversa privada 1-a-1 (não em grupos). Regra batida no backend.
  const canSendAudio = !!activeConvId && activeConv?.kind !== "group" && !!actorId

  // Clans não têm acesso às salas de chat ao vivo — o chat é por user,
  // mas o contexto do actor "clan" não faz sentido nessas abas.
  const isClanActor = activeActor?.type === "clan"

  // Carrega atores
  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    setActorsLoading(true)
    jsonFetch<ActorsResponse>("/api/entity-follows/actors/messageable")
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data?.actors) ? data.actors : []
        setActors(list)
        const stored =
          typeof window !== "undefined"
            ? localStorage.getItem(ACTOR_STORAGE_KEY)
            : null
        const fromQuery =
          initialActorId && list.find((a) => a.id === initialActorId)?.id
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
  }, [status, initialActorId])

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
      setConvsError((err as Error).message || t("loadConversationsError", "Erro ao carregar conversas"))
      setConversations([])
    } finally {
      setConvsLoading(false)
    }
  }, [actorId, activeActor?.type, t])

  // Carrega lista quando muda actor
  useEffect(() => {
    if (!actorId) return
    loadConversations()
  }, [actorId, loadConversations])

  // Polling da lista
  useEffect(() => {
    if (!actorId) return
    const t = setInterval(() => {
      if (!document.hidden) loadConversations()
    }, POLL_LIST_MS)
    return () => clearInterval(t)
  }, [actorId, loadConversations])

  // Debounce do search inline. Mínimo 2 caracteres pra disparar.
  useEffect(() => {
    const q = convSearch.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    let cancelled = false
    setSearchLoading(true)
    const handle = setTimeout(async () => {
      try {
        const data = await jsonFetch<{ results: typeof searchResults }>(
          `/api/conversations/search?q=${encodeURIComponent(q)}`,
        )
        if (cancelled) return
        setSearchResults(Array.isArray(data?.results) ? data.results : [])
      } catch {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
    // searchResults intencionalmente fora das deps — só re-roda quando o termo
    // muda, e o tipo serve só como referência de shape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convSearch])

  const handleStartConvWith = useCallback(
    async (targetId: string) => {
      if (!actorId) return
      try {
        const data = await jsonFetch<OpenResponse>("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actor_id: actorId,
            actor_type: activeActor?.type || "profile",
            target_id: targetId,
          }),
        })
        const id = data?.conversation?.id_conversation
        if (id) {
          setConvSearch("")
          setSearchResults([])
          setActiveConvId(id)
          await loadConversations()
          const params = new URLSearchParams(searchParams.toString())
          params.set("c", id)
          params.delete("with")
          params.delete("as")
          router.replace(`/mensagens?${params.toString()}`)
        }
      } catch (err) {
        alert((err as Error).message || t("openConversationError", "Erro ao abrir conversa"))
      }
    },
    [actorId, activeActor?.type, loadConversations, router, searchParams, t],
  )

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
          setMessagesError((err as Error).message || t("loadMessagesError", "Erro ao carregar mensagens"))
        }
      } finally {
        if (!opts?.silent) setMessagesLoading(false)
      }
    },
    [actorId, activeActor?.type, t]
  )

  // Carrega thread quando muda activeConv
  useEffect(() => {
    if (!activeConvId) return
    loadThread(activeConvId)
  }, [activeConvId, loadThread])

  // Polling da thread (fallback). Realtime cobre o caso normal.
  useEffect(() => {
    if (!activeConvId) return
    const t = setInterval(() => {
      if (!document.hidden) loadThread(activeConvId, { silent: true })
    }, POLL_THREAD_MS)
    return () => clearInterval(t)
  }, [activeConvId, loadThread])

  // Realtime: assina a conv ativa e recarrega thread quando o backend empurra
  // uma mensagem nova (sem precisar esperar o poll).
  useEffect(() => {
    if (!activeConvId) return
    emitRealtime("conversation:subscribe", { id_conversation: activeConvId })
    const off = onRealtime("conversation:message", (raw) => {
      const payload = raw as { id_conversation?: string } | null
      if (!payload || payload.id_conversation !== activeConvId) return
      loadThread(activeConvId, { silent: true })
    })
    return () => {
      emitRealtime("conversation:unsubscribe", { id_conversation: activeConvId })
      off()
    }
  }, [activeConvId, loadThread])

  // Auto scroll quando chega nova mensagem
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length])

  // ----- Solicitações: lista (6 fontes) -----
  const loadOsChats = useCallback(async () => {
    setOsChatsLoading(true)
    setOsChatsError(null)
    try {
      const [svcU, svcP, crsU, crsP, prodU, prodP] = await Promise.all([
        jsonFetch<OsChatsListResponse>(`/api/service-requests/me/chats`).catch(() => ({ chats: [] })),
        jsonFetch<OsChatsListResponse>(`/api/service-requests/me/pro-chats`).catch(() => ({ chats: [] })),
        jsonFetch<OsChatsListResponse>(`/api/course-requests/me/chats`).catch(() => ({ chats: [] })),
        jsonFetch<OsChatsListResponse>(`/api/course-requests/me/pro-chats`).catch(() => ({ chats: [] })),
        jsonFetch<{ requests?: ProductBuyerRequest[] }>(`/api/product-requests/me`).catch(() => ({ requests: [] })),
        jsonFetch<{ responses?: ProductSellerResponse[] }>(`/api/product-requests/me/sent`).catch(() => ({ responses: [] })),
      ])

      const tag = (chats: OsChatItem[] | undefined, kind: "service" | "course", side: "user" | "pro") =>
        (Array.isArray(chats) ? chats : []).map((c) => ({ ...c, kind, side }))

      const serviceUser = tag(svcU?.chats, "service", "user")
      const servicePro = tag(svcP?.chats, "service", "pro")
      const courseUser = tag(crsU?.chats, "course", "user")
      const coursePro = tag(crsP?.chats, "course", "pro")

      // Produto — lado comprador (1 item por pedido, read-only)
      const productBuyer: OsChatItem[] = (Array.isArray(prodU?.requests) ? prodU.requests : []).map((r) => ({
        id_response: `product-buyer:${r.id_product_request}`,
        response_status: r.status,
        response_created_at: r.created_at,
        last_message: null,
        last_message_at: r.updated_at || r.created_at,
        unread_count: 0,
        kind: "product" as const,
        side: "user" as const,
        request: {
          id_request: r.id_product_request, status: r.status, description: r.description,
          estado: r.state, municipio: r.city, id_machine: 0, id_category: 0,
          machine_name: null, category_name: r.category_name, id_response_chosen: null,
        },
        profile: {
          id_profile: "", display_name: r.title, avatar_url: null,
          sub_profile_slug: null, username: null, is_clan: false,
        },
        productInfo: {
          title: r.title, description: r.description, city: r.city, state: r.state,
          category_name: r.category_name, status: r.status,
          seller_message: null, proposed_price_cents: null,
        },
      }))

      // Produto — lado vendedor (1 item por resposta enviada, read-only)
      const productSeller: OsChatItem[] = (Array.isArray(prodP?.responses) ? prodP.responses : []).map((r) => ({
        id_response: `product-seller:${r.id_response}`,
        response_status: r.status,
        response_created_at: r.created_at,
        last_message: r.message,
        last_message_at: r.updated_at || r.created_at,
        unread_count: 0,
        kind: "product" as const,
        side: "pro" as const,
        request: {
          id_request: r.id_product_request, status: r.request_status, description: r.request_description,
          estado: r.request_state, municipio: r.request_city, id_machine: 0, id_category: 0,
          machine_name: null, category_name: r.category_name, id_response_chosen: null,
        },
        profile: {
          id_profile: "", display_name: r.buyer_username || "Comprador", avatar_url: null,
          sub_profile_slug: null, username: r.buyer_username || null, is_clan: false,
        },
        productInfo: {
          title: r.request_title, description: r.request_description, city: r.request_city,
          state: r.request_state, category_name: r.category_name, status: r.request_status,
          seller_message: r.message, proposed_price_cents: r.proposed_price_cents,
        },
      }))

      const merged = [
        ...serviceUser, ...servicePro, ...courseUser, ...coursePro, ...productBuyer, ...productSeller,
      ].sort((a, b) => {
        const ta = new Date(a.last_message_at || a.response_created_at).getTime()
        const tb = new Date(b.last_message_at || b.response_created_at).getTime()
        return tb - ta
      })
      setOsChats(merged)
    } catch (err) {
      setOsChatsError((err as Error).message || t("loadOsError", "Erro ao carregar solicitações"))
      setOsChats([])
    } finally {
      setOsChatsLoading(false)
    }
  }, [t])

  // Resolve o prefixo de endpoint para o chat ativo (serviço vs curso).
  const osEndpointBase = useCallback(
    (idResponse: string) => {
      const chat = osChats.find((c) => c.id_response === idResponse)
      return chat?.kind === "course" ? "/api/course-requests" : "/api/service-requests"
    },
    [osChats],
  )

  useEffect(() => {
    if (status !== "authenticated") return
    if (tab !== "os") return
    loadOsChats()
  }, [status, tab, loadOsChats])

  useEffect(() => {
    if (status !== "authenticated") return
    if (tab !== "os") return
    const t = setInterval(() => {
      if (!document.hidden) loadOsChats()
    }, POLL_LIST_MS)
    return () => clearInterval(t)
  }, [status, tab, loadOsChats])

  // Solicitações são do usuário inteiro (serviço/produto/curso, ambos os lados),
  // não de um subperfil específico — por isso não filtra por actorId.
  const visibleOsChats = osChats

  const activeOsChat = useMemo(
    () => visibleOsChats.find((c) => c.id_response === activeOsResponseId) || null,
    [visibleOsChats, activeOsResponseId]
  )

  const loadOsThread = useCallback(
    async (idResponse: string, opts?: { silent?: boolean }) => {
      if (!idResponse) return
      if (!opts?.silent) {
        setOsMessagesLoading(true)
        setOsMessagesError(null)
      }
      try {
        const base = osEndpointBase(idResponse)
        const data = await jsonFetch<OsMessagesResponse>(
          `${base}/responses/${encodeURIComponent(idResponse)}/messages`
        )
        const items = Array.isArray(data?.messages) ? data.messages : []
        setOsMessages(items)
        if (data?.response?.status) setOsCurrentStatus(data.response.status)
        if (data?.side) setOsViewerSide(data.side)
        jsonFetch(`${base}/responses/${encodeURIComponent(idResponse)}/read`, {
          method: "POST",
        }).catch(() => {})
        // backend já marca read no GET — atualiza unread local
        setOsChats((prev) => prev.map((c) =>
          c.id_response === idResponse ? { ...c, unread_count: 0 } : c
        ))
        window.dispatchEvent(new Event("mensagens:unread-changed"))
      } catch (err) {
        if (!opts?.silent) {
          setOsMessagesError((err as Error).message || t("loadMessagesError", "Erro ao carregar mensagens"))
        }
      } finally {
        if (!opts?.silent) setOsMessagesLoading(false)
      }
    },
    [t, osEndpointBase]
  )

  useEffect(() => {
    if (!activeOsResponseId) return
    if (tab !== "os") return
    loadOsThread(activeOsResponseId)
  }, [activeOsResponseId, tab, loadOsThread])

  useEffect(() => {
    if (!activeOsResponseId) return
    if (tab !== "os") return
    const t = setInterval(() => {
      if (!document.hidden) loadOsThread(activeOsResponseId, { silent: true })
    }, POLL_THREAD_MS)
    return () => clearInterval(t)
  }, [activeOsResponseId, tab, loadOsThread])

  useEffect(() => {
    osThreadEndRef.current?.scrollIntoView({ block: "end" })
  }, [osMessages.length])

  const handleSelectTab = useCallback((next: MainTab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === "conv") {
      params.delete("tab")
      params.delete("response")
      params.delete("machine_id")
    } else if (next === "os") {
      params.set("tab", "os")
      params.delete("c")
      params.delete("machine_id")
    } else if (next === "global") {
      params.set("tab", "global")
      params.delete("c")
      params.delete("response")
      params.delete("machine_id")
    } else {
      params.set("tab", "machine")
      params.delete("c")
      params.delete("response")
      if (chatMachineId) {
        params.set("machine_id", String(chatMachineId))
      }
    }
    const qs = params.toString()
    router.replace(qs ? `/mensagens?${qs}` : "/mensagens")
  }, [router, searchParams, chatMachineId])

  // Carrega enxames (uma vez) — usado pelo seletor da aba "Enxames"
  useEffect(() => {
    if (status !== "authenticated") return
    if (machinesLoaded || machinesLoading) return
    let cancelled = false
    setMachinesLoading(true)
    jsonFetch<{ user_machines: ChatMachine[]; all_machines: ChatMachine[] }>(
      "/api/chat/machines"
    )
      .then((data) => {
        if (cancelled) return
        const own = Array.isArray(data?.user_machines) ? data.user_machines : []
        const all = Array.isArray(data?.all_machines) ? data.all_machines : []
        setUserMachines(own)
        setAllMachines(all)
        setMachinesLoaded(true)
        // Auto-seleciona se houver exatamente um enxame e nenhum vindo da URL
        if (!chatMachineId && own.length === 1) {
          setChatMachineId(own[0].id_machine)
        }
      })
      .catch(() => {
        if (!cancelled) setMachinesLoaded(true)
      })
      .finally(() => {
        if (!cancelled) setMachinesLoading(false)
      })
    return () => {
      cancelled = true
    }
    // chatMachineId apenas como leitura aqui; effect roda só uma vez por sessão autenticada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const handlePickMachine = useCallback((id: number) => {
    setChatMachineId(id)
    setNeedsMachinePick(false)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "machine")
    params.set("machine_id", String(id))
    router.replace(`/mensagens?${params.toString()}`)
  }, [router, searchParams])

  // Se o usuário troca para um actor clan enquanto está em Global/Enxames,
  // volta automaticamente para Conversas (clans não têm essas abas).
  useEffect(() => {
    if (!isClanActor) return
    if (tab !== "global" && tab !== "machine") return
    setTab("conv")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("tab")
    params.delete("machine_id")
    params.delete("response")
    const qs = params.toString()
    router.replace(qs ? `/mensagens?${qs}` : "/mensagens")
  }, [isClanActor, tab, router, searchParams])

  const handleClearMachine = useCallback(() => {
    setChatMachineId(null)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "machine")
    params.delete("machine_id")
    router.replace(`/mensagens?${params.toString()}`)
  }, [router, searchParams])

  const handleSelectOsChat = useCallback((idResponse: string) => {
    setActiveOsResponseId(idResponse)
    setOsCurrentStatus("")
    setOsViewerSide("USER")
    setOsComposer("")
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", "os")
    params.set("response", idResponse)
    params.delete("c")
    router.replace(`/mensagens?${params.toString()}`)
  }, [router, searchParams])

  const handleBackToOsList = useCallback(() => {
    setActiveOsResponseId(null)
    setOsMessages([])
    setOsCurrentStatus("")
    setOsViewerSide("USER")
    const params = new URLSearchParams(searchParams.toString())
    params.delete("response")
    const qs = params.toString()
    router.replace(qs ? `/mensagens?${qs}` : "/mensagens")
  }, [router, searchParams])

  const handleOsSend = useCallback(async () => {
    const content = osComposer.trim()
    if (!content || !activeOsResponseId || osSending) return
    setOsSending(true)
    try {
      const base = osEndpointBase(activeOsResponseId)
      await jsonFetch(
        `${base}/responses/${encodeURIComponent(activeOsResponseId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      )
      setOsComposer("")
      await loadOsThread(activeOsResponseId, { silent: true })
      loadOsChats()
    } catch (err) {
      setOsMessagesError((err as Error).message || t("sendMessageError", "Erro ao enviar"))
    } finally {
      setOsSending(false)
    }
  }, [osComposer, activeOsResponseId, osSending, loadOsThread, loadOsChats, osEndpointBase, t])

  const handleSelectActor = useCallback((id: string) => {
    setActorId(id)
    setActiveConvId(null)
    setActiveDetail(null)
    setMessages([])
    setComposer("")
    setActiveOsResponseId(null)
    setOsMessages([])
    setOsCurrentStatus("")
    const params = new URLSearchParams(searchParams.toString())
    params.set("actor", id)
    params.delete("c")
    params.delete("response")
    const qs = params.toString()
    router.replace(qs ? `/mensagens?${qs}` : "/mensagens")
  }, [router, searchParams])

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

  const handleDeleteConversation = useCallback(async () => {
    if (!activeConvId) return
    const ok = window.confirm(
      t(
        "deleteConversationConfirm",
        "Excluir esta conversa? O histórico some dos dois lados. Sem volta.",
      ),
    )
    if (!ok) return
    try {
      await jsonFetch(`/api/conversations/${encodeURIComponent(activeConvId)}`, {
        method: "DELETE",
      })
      handleBackToList()
      await loadConversations()
    } catch (err) {
      alert((err as Error).message || t("deleteConversationError", "Erro ao excluir conversa"))
    }
  }, [activeConvId, handleBackToList, loadConversations, t])

  const handleDeleteOsChat = useCallback(async () => {
    if (!activeOsResponseId) return
    const ok = window.confirm(
      t(
        "deleteOsChatConfirm",
        "Excluir esta conversa de O.S.? O histórico some dos dois lados. Sem volta.",
      ),
    )
    if (!ok) return
    try {
      const base = osEndpointBase(activeOsResponseId)
      await jsonFetch(`${base}/responses/${encodeURIComponent(activeOsResponseId)}`, {
        method: "DELETE",
      })
      handleBackToOsList()
      await loadOsChats()
    } catch (err) {
      alert((err as Error).message || t("deleteOsChatError", "Erro ao excluir conversa"))
    }
  }, [activeOsResponseId, handleBackToOsList, loadOsChats, osEndpointBase, t])

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
      setMessagesError((err as Error).message || t("sendMessageError", "Erro ao enviar"))
    } finally {
      setSending(false)
    }
  }, [composer, actorId, activeConvId, sending, activeActor?.type, loadConversations, t])

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
            {t("loginPromptTitle", "Entre para ver suas mensagens")}
          </h1>
          <p className="mb-5 text-sm text-white/60">
            {t("loginPromptDescription", "Você precisa estar logado para usar a caixa de mensagens.")}
          </p>
          <Link href="/login">
            <Button>{t("loginButton", "Fazer login")}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto min-h-[calc(100dvh-72px)] px-0 md:px-4 md:py-6">
      <div className="grid h-[calc(100dvh-72px)] grid-cols-1 overflow-hidden border-y border-white/[0.06] bg-gradient-to-b from-neutral-950 via-neutral-950 to-black md:h-[calc(100dvh-120px)] md:grid-cols-[340px_1fr] md:rounded-2xl md:border md:border-white/10 md:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]">
        {/* Lista (Conversas ou O.S.) */}
        <aside
          className={cn(
            "flex flex-col border-r border-white/10",
            // Mobile: esconde aside quando uma thread/sala está aberta.
            // Para global, sempre que a aba está ativa, o painel direito assume a tela.
            // Para machine, esconde se já tem enxame escolhido (sala aberta).
            (tab === "conv"
              ? activeConvId
              : tab === "os"
                ? activeOsResponseId
                : tab === "global"
                  ? true
                  : chatMachineId)
              ? "hidden md:flex"
              : "flex"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] px-4 py-3.5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-white">
                {t("messagesHeaderTitle", "Mensagens")}
              </h2>
              <p className="text-[11px] text-white/40">
                {tab === "conv" ? t("conversationsSubtitle", "Suas conversas") : t("osSubtitle", "Suas ordens de serviço")}
              </p>
            </div>
            {tab === "conv" ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCreateGroupOpen(true)}
                  disabled={!actorId}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 text-black shadow-[0_8px_20px_-6px_rgba(250,204,21,0.5)] transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  title={t("createGroupButtonTooltip", "Criar grupo")}
                  aria-label={t("createGroupButtonTooltip", "Criar grupo")}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <ActorSelector
                  actors={actors}
                  actorId={actorId}
                  loading={actorsLoading}
                  onSelect={handleSelectActor}
                />
              </div>
            ) : null}
          </div>

          {/* Tabs */}
          <div className="flex items-stretch border-b border-white/[0.07]">
            <TabBtn
              active={tab === "conv"}
              onClick={() => handleSelectTab("conv")}
              icon={<MessageCircle className="h-3.5 w-3.5" />}
              label={t("conversationsTabLabel", "Conversas")}
              shortLabel={t("conversationsTabShortLabel", "Conv.")}
              dataTour="messages-tab-conv"
            />
            <TabBtn
              active={tab === "os"}
              onClick={() => handleSelectTab("os")}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
              label={t("osTabLabel", "Solicitações")}
              shortLabel={t("osTabShortLabel", "Solicit.")}
              dataTour="messages-tab-os"
            />
            {!isClanActor && (
              <>
                <TabBtn
                  active={tab === "global"}
                  onClick={() => handleSelectTab("global")}
                  icon={<Radio className="h-3.5 w-3.5" />}
                  label={t("globalTabLabel", "Global")}
                  shortLabel={t("globalTabLabel", "Global")}
                  dataTour="messages-tab-global"
                />
                <TabBtn
                  active={tab === "machine"}
                  onClick={() => handleSelectTab("machine")}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label={t("machinesTabLabel", "Enxames")}
                  shortLabel={t("machinesTabShortLabel", "Máq.")}
                  dataTour="messages-tab-machine"
                />
              </>
            )}
          </div>

          <div className={cn("flex-1 overflow-y-auto", tab !== "conv" && "hidden")}>
            {/* Search inline pra encontrar perfis/clans pra começar nova conversa */}
            <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-black/40 px-3 py-2 backdrop-blur">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 focus-within:border-yellow-400/40 focus-within:bg-white/[0.06]">
                <Search className="h-3.5 w-3.5 shrink-0 text-white/40" />
                <input
                  type="text"
                  value={convSearch}
                  onChange={(e) => setConvSearch(e.target.value)}
                  placeholder={t("searchProfilesPlaceholder", "Buscar @usuário ou nome")}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                {convSearch ? (
                  <button
                    type="button"
                    onClick={() => setConvSearch("")}
                    className="text-white/40 hover:text-white"
                    aria-label={t("clearSearchAria", "Limpar busca")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            {convSearch.trim().length >= 2 ? (
              searchLoading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-white/45">
                  {t("searchProfilesEmpty", "Nenhum perfil encontrado para essa busca.")}
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {searchResults.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => handleStartConvWith(r.id)}
                        disabled={!actorId}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={r.avatar_url || undefined} />
                          <AvatarFallback className="bg-neutral-800 text-xs text-white">
                            {entityInitials(r.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-white">
                            {r.display_name || t("noNameLabel", "Sem nome")}
                          </div>
                          <div className="truncate text-[11px] text-white/45">
                            {r.username ? `@${r.username}` : ""}
                            {r.is_clan
                              ? ` · ${t("clanLabel", "Clan")}`
                              : r.is_user_account
                              ? ` · ${t("userAccountLabel", "Conta")}`
                              : ` · ${t("subprofileLabel", "Subperfil")}`}
                          </div>
                        </div>
                        <MessageCircle className="h-4 w-4 text-white/40" />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : convsLoading && conversations.length === 0 ? (
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
                {conversations.map((c) => {
                  const isGroup = c.kind === "group"
                  const otherHref = isGroup ? null : entityHref(c.other_entity)
                  const title = isGroup
                    ? (c.name || t("groupFallback", "Grupo"))
                    : (c.other_entity?.display_name || t("noNameLabel", "Sem nome"))
                  return (
                  <li key={c.id_conversation} className="relative">
                    <button
                      onClick={() => handleSelectConv(c.id_conversation)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5",
                        activeConvId === c.id_conversation && "bg-white/5"
                      )}
                    >
                      {isGroup ? (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400/20 to-amber-500/10 ring-1 ring-yellow-400/30">
                          {c.cover_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.cover_url} alt={title} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            <Users className="h-5 w-5 text-yellow-300" />
                          )}
                        </div>
                      ) : (
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={c.other_entity?.avatar_url || undefined} />
                          <AvatarFallback className="bg-neutral-800 text-xs text-white">
                            {entityInitials(c.other_entity?.display_name)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-white inline-flex items-center gap-1.5">
                            {title}
                            {isGroup && c.member_count != null && (
                              <span className="text-[10px] text-yellow-300/80 tabular-nums">· {c.member_count}</span>
                            )}
                          </span>
                          <span className="shrink-0 text-[10px] text-white/40">
                            {formatTime(c.last_message_at || c.created_at, locale)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={cn(
                            "truncate text-xs",
                            c.unread_count > 0 ? "text-white" : "text-white/50"
                          )}>
                            {c.is_last_message_from_me ? t("sentByMePrefix", "Você: ") : ""}
                            {c.last_message_preview || t("noMessagesYet", "Sem mensagens ainda")}
                          </span>
                          {c.unread_count > 0 && (
                            <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                              {c.unread_count > 99 ? "99+" : c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {otherHref && (
                      <Link
                        href={otherHref}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("viewProfileOfAria", "Ver perfil de {name}").replace("{name}", c.other_entity?.display_name || t("contactFallback", "contato"))}
                        className="absolute left-4 top-3 h-10 w-10 rounded-full"
                      />
                    )}
                  </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Lista O.S. */}
          <div className={cn("flex-1 overflow-y-auto", tab !== "os" && "hidden")}>
            {osChatsLoading && osChats.length === 0 ? (
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
            ) : osChatsError ? (
              <div className="p-6 text-center text-sm text-red-400">{osChatsError}</div>
            ) : visibleOsChats.length === 0 ? (
              <EmptyOsChats />
            ) : (
              <ul className="divide-y divide-white/5">
                {visibleOsChats.map((c) => {
                  const isProduct = c.kind === "product"
                  const kindLabel = c.kind === "course" ? "Curso" : c.kind === "product" ? "Produto" : "Serviço"
                  const kindColor =
                    c.kind === "course" ? "bg-sky-500/15 text-sky-300"
                    : c.kind === "product" ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-amber-500/15 text-amber-300"
                  const sideLabel = c.side === "pro" ? "Respondi" : "Pedi"
                  const titleText = isProduct
                    ? (c.productInfo?.title || "Pedido de produto")
                    : (c.profile.display_name || t("professionalFallback", "Profissional"))
                  const profHref = !isProduct ? entityHref({
                    type: "profile",
                    id: c.profile.id_profile,
                    username: c.profile.username,
                    sub_profile_slug: c.profile.sub_profile_slug,
                  }) : null
                  return (
                  <li key={c.id_response} className="relative">
                    <button
                      onClick={() => isProduct ? setProductDetail(c) : handleSelectOsChat(c.id_response)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5",
                        activeOsResponseId === c.id_response && "bg-white/5"
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={c.profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-neutral-800 text-xs text-white">
                          {entityInitials(titleText)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-white">{titleText}</span>
                          <span className="shrink-0 text-[10px] text-white/40">
                            {formatTime(c.last_message_at || c.response_created_at, locale)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide", kindColor)}>
                            {kindLabel}
                          </span>
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/55">
                            {sideLabel}
                          </span>
                          {!isProduct && (
                            <span className="truncate text-[10px] text-white/50">
                              {c.request.category_name || c.request.machine_name || ""}
                            </span>
                          )}
                          {isProduct && c.productInfo?.category_name && (
                            <span className="truncate text-[10px] text-white/50">{c.productInfo.category_name}</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={cn(
                            "truncate text-xs",
                            c.unread_count > 0 ? "text-white" : "text-white/50"
                          )}>
                            {c.last_message || osStatusLabel(c.response_status, t)}
                          </span>
                          {c.unread_count > 0 && (
                            <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                              {c.unread_count > 99 ? "99+" : c.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {profHref && (
                      <Link
                        href={profHref}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("viewProfileOfAria", "Ver perfil de {name}").replace("{name}", c.profile.display_name || t("professionalFallback", "profissional"))}
                        className="absolute left-4 top-3 h-10 w-10 rounded-full"
                      />
                    )}
                  </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Lista — Chat Global (info estática) */}
          <div className={cn("flex-1 overflow-y-auto px-4 py-6", tab !== "global" && "hidden")}>
            <div className="rounded-xl border border-white/10 bg-neutral-900/60 p-4">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Radio className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold">{t("globalChatTitle", "Chat global")}</span>
              </div>
              <p className="text-[12px] leading-relaxed text-white/60">
                {t("globalChatInfo", "Sala aberta com até 200 usuários simultâneos. Quando lota, uma segunda instância é criada automaticamente.")}
              </p>
              <ul className="mt-3 space-y-1.5 text-[11px] text-white/55">
                <li>{t("globalChatBulletExpiration", "• Mensagens são removidas após 24h.")}</li>
                <li>{t("globalChatBulletReports", "• Comportamento abusivo pode ser denunciado.")}</li>
                <li>{t("globalChatBulletPrivacy", "• Não compartilhe dados pessoais.")}</li>
              </ul>
            </div>
          </div>

          {/* Lista — Enxames */}
          <div className={cn("flex-1 overflow-y-auto", tab !== "machine" && "hidden")}>
            <MachineList
              userMachines={userMachines}
              allMachines={allMachines}
              loading={machinesLoading && !machinesLoaded}
              activeId={chatMachineId}
              onPick={handlePickMachine}
            />
          </div>
        </aside>

        {/* Painel direito — Chat ao vivo Global */}
        {tab === "global" ? (
          <section className="flex min-w-0 flex-col overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <ChatRoomPanel
                kind="global"
                pageTitle={t("liveChat", "Chat ao vivo")}
                pageSubtitle={t("globalChatPageSubtitle", "Sala global — todos os usuários do Freelandoo")}
              />
            </div>
          </section>
        ) : tab === "machine" ? (
          <section
            className={cn(
              "flex min-w-0 flex-col",
              chatMachineId ? "flex" : "hidden md:flex"
            )}
          >
            {chatMachineId ? (
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-white/[0.07] bg-black/20 px-3 py-2 md:hidden">
                  <button
                    onClick={handleClearMachine}
                    className="text-white/60 hover:text-white"
                    aria-label={t("changeMachineAria", "Trocar enxame")}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="text-xs text-white/60">{t("changeMachineButton", "Trocar enxame")}</span>
                </div>
                <ChatRoomPanel
                  key={`m-${chatMachineId}`}
                  kind="machine"
                  machineId={chatMachineId}
                  pageTitle={t("liveChat", "Chat ao vivo")}
                  pageSubtitle={t("machineChatPageSubtitle", "Sala do seu enxame")}
                />
                <div className="hidden border-t border-white/10 px-4 py-2 md:flex md:items-center md:justify-between">
                  <span className="text-[11px] text-white/45">
                    {t("changeMachineHint", "Trocar de enxame não afeta seu enxame principal.")}
                  </span>
                  <button
                    onClick={handleClearMachine}
                    className="text-[11px] text-primary hover:underline"
                  >
                    {t("changeMachineButton", "Trocar enxame")}
                  </button>
                </div>
              </div>
            ) : (
              <EmptyMachinePick />
            )}
          </section>
        ) : tab === "os" ? (
          <section
            className={cn(
              "flex min-w-0 flex-col",
              activeOsResponseId ? "flex" : "hidden md:flex"
            )}
          >
            {!activeOsResponseId || !activeOsChat ? (
              <EmptyOsThread />
            ) : (
              <>
                <header className="flex flex-col gap-2 border-b border-white/[0.07] bg-black/20 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToOsList}
                      className="text-white/60 hover:text-white md:hidden"
                      aria-label={t("backAriaLabel", "Voltar")}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {(() => {
                      const href = entityHref({
                        type: "profile",
                        id: activeOsChat.profile.id_profile,
                        username: activeOsChat.profile.username,
                        sub_profile_slug: activeOsChat.profile.sub_profile_slug,
                      })
                      const av = (
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={activeOsChat.profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-neutral-800 text-xs text-white">
                            {entityInitials(activeOsChat.profile.display_name)}
                          </AvatarFallback>
                        </Avatar>
                      )
                      return href ? (
                        <Link href={href} aria-label={t("viewProfileLink", "Ver perfil")} className="shrink-0">{av}</Link>
                      ) : av
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-white">
                        {activeOsChat.profile.display_name || t("professionalFallback", "Profissional")}
                      </div>
                      <div className="truncate text-[11px] text-white/50">
                        {activeOsChat.profile.username ? `@${activeOsChat.profile.username}` : t("subprofileLabel", "Subperfil")}
                        {" · "}
                        <span className={cn(
                          OS_TERMINAL_STATUS.has(osCurrentStatus || activeOsChat.response_status)
                            ? "text-white/40"
                            : "text-primary"
                        )}>
                          {osStatusLabel(osCurrentStatus || activeOsChat.response_status, t)}
                        </span>
                      </div>
                    </div>
                    {activeOsChat.profile.username && activeOsChat.profile.sub_profile_slug ? (
                      <Link
                        href={`/p/${activeOsChat.profile.username}/${activeOsChat.profile.sub_profile_slug}`}
                        className="text-xs text-primary hover:underline"
                      >
                        {t("viewProfileLink", "Ver perfil")}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleDeleteOsChat}
                      className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-red-500/10 hover:text-red-300"
                      aria-label={t("deleteConversationAria", "Excluir conversa")}
                      title={t("deleteConversationAria", "Excluir conversa")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-neutral-900/40 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeOsChat.request.machine_name ? (
                        <span className="inline-flex items-center rounded-full border border-white/10 bg-neutral-800/60 px-2 py-0.5 text-[10px] text-white">
                          {activeOsChat.request.machine_name}
                        </span>
                      ) : null}
                      {activeOsChat.request.category_name ? (
                        <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">
                          {activeOsChat.request.category_name}
                        </span>
                      ) : null}
                      {activeOsChat.request.municipio ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-white/50">
                          <MapPin className="h-3 w-3" />
                          {activeOsChat.request.municipio}
                          {activeOsChat.request.estado ? `, ${activeOsChat.request.estado}` : ""}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs text-white/70 whitespace-pre-wrap">
                      {activeOsChat.request.description}
                    </p>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {osMessagesLoading && osMessages.length === 0 ? (
                    <div className="space-y-3">
                      {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-3/4 rounded-2xl" />
                      ))}
                    </div>
                  ) : osMessagesError ? (
                    <div className="text-center text-sm text-red-400">{osMessagesError}</div>
                  ) : osMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-white/40">
                      <MessageCircle className="mb-2 h-8 w-8" />
                      {t("noMessagesYetThread", "Nenhuma mensagem ainda.")}
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      <AnimatePresence initial={false}>
                        {osMessages.map((m, idx) => {
                          const mine = m.sender === osViewerSide
                          const prev = osMessages[idx - 1]
                          const showDay =
                            !prev || dayKey(prev.created_at) !== dayKey(m.created_at)
                          const sameSenderAsPrev =
                            !!prev && prev.sender === m.sender && !showDay
                          return (
                            <div key={m.id_message}>
                              {showDay && (
                                <div className="my-4 flex items-center justify-center">
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-wider text-white/55 backdrop-blur">
                                    {dayLabel(m.created_at, t, locale)}
                                  </span>
                                </div>
                              )}
                              <motion.li
                                layout="position"
                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={SPRING}
                                className={cn(
                                  "flex items-end gap-2",
                                  mine ? "flex-row-reverse" : "flex-row",
                                  sameSenderAsPrev ? "mt-0" : "mt-1"
                                )}
                              >
                                <div className={cn("flex max-w-[80%] min-w-0 flex-col", mine ? "items-end" : "items-start")}>
                                  <div
                                    className={cn(
                                      "relative px-4 py-2.5 text-sm leading-relaxed break-words shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                                      mine
                                        ? "rounded-3xl rounded-br-md bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-950 shadow-[0_8px_24px_-12px_rgba(250,204,21,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]"
                                        : "rounded-3xl rounded-bl-md bg-white/[0.06] text-white ring-1 ring-white/10 backdrop-blur-md"
                                    )}
                                  >
                                    <MarkdownText
                                      prose={!mine}
                                      className={mine ? "[&_a]:text-neutral-900 [&_a]:underline [&_code]:bg-black/15 [&_p]:my-1" : undefined}
                                    >
                                      {m.content}
                                    </MarkdownText>
                                  </div>
                                  <span className={cn("mt-0.5 px-1 text-[10px] tabular-nums", mine ? "text-white/40" : "text-white/35")}>
                                    {formatTime(m.created_at, locale)}
                                  </span>
                                </div>
                              </motion.li>
                            </div>
                          )
                        })}
                      </AnimatePresence>
                    </ul>
                  )}
                  <div ref={osThreadEndRef} />
                </div>

                <div className="shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black/60 to-black/20 px-3 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl sm:px-4">
                  {OS_TERMINAL_STATUS.has(osCurrentStatus || activeOsChat.response_status) ? (
                    <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/55">
                      <Lock className="h-3.5 w-3.5" />
                      {t("conversationClosedStatus", "Conversa encerrada — {status}.").replace("{status}", osStatusLabel(osCurrentStatus || activeOsChat.response_status, t).toLowerCase())}
                    </div>
                  ) : (
                    <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus-within:border-yellow-400/40 focus-within:bg-white/[0.05]">
                      <OfferingPickerButton
                        onPick={(md) =>
                          setOsComposer((c) => {
                            const sep = c && !c.endsWith("\n") ? "\n" : ""
                            return (c + sep + md).slice(0, 4000)
                          })
                        }
                      />
                      <EmojiPickerButton
                        onPick={(emoji) =>
                          setOsComposer((c) => (c + emoji).slice(0, 4000))
                        }
                      />
                      <Textarea
                        value={osComposer}
                        onChange={(e) => setOsComposer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleOsSend()
                          }
                        }}
                        placeholder={t("writeMessagePlaceholder", "Escrever mensagem")}
                        rows={1}
                        className="min-h-[40px] max-h-32 flex-1 resize-none border-0 bg-transparent text-sm text-white placeholder:text-white/35 focus-visible:ring-0"
                      />
                      <motion.button
                        type="button"
                        onClick={handleOsSend}
                        disabled={osSending || !osComposer.trim()}
                        whileTap={{ scale: 0.94 }}
                        transition={SPRING}
                        aria-label={t("sendMessageAriaLabel", "Enviar")}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-950 shadow-[0_8px_20px_-8px_rgba(250,204,21,0.55)] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                      >
                        {osSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </motion.button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        ) : (
        /* Thread Conversas */
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
                  aria-label={t("backAriaLabel", "Voltar")}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {(() => {
                  const href = entityHref(activeDetail?.other_entity)
                  const av = (
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={activeDetail?.other_entity?.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-800 text-xs text-white">
                        {entityInitials(activeDetail?.other_entity?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                  )
                  return href ? (
                    <Link href={href} aria-label={t("viewProfileLink", "Ver perfil")} className="shrink-0">{av}</Link>
                  ) : av
                })()}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white">
                    {activeDetail?.other_entity?.display_name || t("conversationFallback", "Conversa")}
                  </div>
                  <div className="truncate text-[11px] text-white/50">
                    {activeDetail?.other_entity?.type === "clan" ? t("clanLabel", "Clan") : t("subprofileLabel", "Subperfil")}
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
                        {t("viewProfileLink", "Ver perfil")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={handleDeleteConversation}
                  className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/55 transition hover:bg-red-500/10 hover:text-red-300"
                  aria-label={t("deleteConversationAria", "Excluir conversa")}
                  title={t("deleteConversationAria", "Excluir conversa")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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
                    {t("startConversationHint", "Comece a conversa.")}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
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
                              <div className="my-4 flex items-center justify-center">
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-wider text-white/55 backdrop-blur">
                                  {dayLabel(m.created_at, t, locale)}
                                </span>
                              </div>
                            )}
                            <motion.li
                              layout="position"
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              transition={SPRING}
                              className={cn(
                                "flex items-end gap-2",
                                mine ? "flex-row-reverse" : "flex-row",
                                sameSenderAsPrev ? "mt-0" : "mt-1"
                              )}
                            >
                              <div className={cn("flex max-w-[80%] min-w-0 flex-col", mine ? "items-end" : "items-start")}>
                                <div
                                  className={cn(
                                    "relative text-sm leading-relaxed shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
                                    m.kind === "audio" ? "" : "px-4 py-2.5 break-words",
                                    mine
                                      ? "rounded-3xl rounded-br-md bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-950 shadow-[0_8px_24px_-12px_rgba(250,204,21,0.5),inset_0_1px_0_rgba(255,255,255,0.35)]"
                                      : "rounded-3xl rounded-bl-md bg-white/[0.06] text-white ring-1 ring-white/10 backdrop-blur-md"
                                  )}
                                >
                                  {m.kind === "audio" && m.audio_url ? (
                                    <AudioMessage
                                      src={m.audio_url}
                                      durationSeconds={m.audio_duration_seconds}
                                      mine={mine}
                                    />
                                  ) : (
                                    <MarkdownText
                                      prose={!mine}
                                      className={mine ? "[&_a]:text-neutral-900 [&_a]:underline [&_code]:bg-black/15 [&_p]:my-1" : undefined}
                                    >
                                      {m.body || ""}
                                    </MarkdownText>
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    "mt-0.5 px-1 text-[10px] tabular-nums",
                                    mine ? "text-white/40" : "text-white/35"
                                  )}
                                >
                                  {formatTime(m.created_at, locale)}
                                </span>
                              </div>
                            </motion.li>
                          </div>
                        )
                      })}
                    </AnimatePresence>
                  </ul>
                )}
                <div ref={threadEndRef} />
              </div>

              <div className="shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black/60 to-black/20 px-3 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl sm:px-4">
                {audioRecorderActive && canSendAudio ? (
                  <AudioRecorder
                    conversationId={activeConvId}
                    actorId={actorId!}
                    actorType={activeActor?.type === "clan" ? "clan" : "profile"}
                    onActiveChange={setAudioRecorderActive}
                    onSent={() => {
                      setAudioRecorderActive(false)
                      void loadThread(activeConvId)
                      void loadConversations()
                    }}
                  />
                ) : (
                  <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus-within:border-yellow-400/40 focus-within:bg-white/[0.05]">
                    <EmojiPickerButton
                      onPick={(emoji) =>
                        setComposer((c) => (c + emoji).slice(0, 4000))
                      }
                    />
                    <Textarea
                      value={composer}
                      onChange={(e) => setComposer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder={t("writeMessagePlaceholder", "Escrever mensagem")}
                      rows={1}
                      className="min-h-[40px] max-h-32 flex-1 resize-none border-0 bg-transparent text-sm text-white placeholder:text-white/35 focus-visible:ring-0"
                    />
                    {canSendAudio && (
                      <AudioRecorder
                        conversationId={activeConvId}
                        actorId={actorId!}
                        actorType={activeActor?.type === "clan" ? "clan" : "profile"}
                        onActiveChange={setAudioRecorderActive}
                        onSent={() => {
                          setAudioRecorderActive(false)
                          void loadThread(activeConvId)
                          void loadConversations()
                        }}
                      />
                    )}
                    <motion.button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !composer.trim()}
                      whileTap={{ scale: 0.94 }}
                      transition={SPRING}
                      aria-label={t("sendMessageAriaLabel", "Enviar")}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-950 shadow-[0_8px_20px_-8px_rgba(250,204,21,0.55)] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
        )}
      </div>

      <CreateGroupModal
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        ownerProfileId={!isClanActor ? actorId : null}
        onCreated={(id) => {
          setActiveConvId(id)
          handleSelectTab("conv")
          // força reload da lista
          void loadConversations()
        }}
      />

      {productDetail?.productInfo && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setProductDetail(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-950 to-black text-white"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                  Produto
                </span>
                <h3 className="text-sm font-semibold tracking-tight">
                  {productDetail.side === "pro" ? "Pedido que você respondeu" : "Seu pedido de produto"}
                </h3>
              </div>
              <button
                onClick={() => setProductDetail(null)}
                className="rounded-full p-1.5 text-white/50 hover:bg-white/[0.05] hover:text-white"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div>
                <p className="text-base font-semibold tracking-tight text-white">{productDetail.productInfo.title}</p>
                <p className="mt-0.5 text-[11px] text-white/45">
                  {productDetail.productInfo.category_name || "Sem categoria"}
                  {productDetail.productInfo.city ? ` · ${productDetail.productInfo.city}` : ""}
                  {productDetail.productInfo.state ? `/${productDetail.productInfo.state}` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Descrição</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{productDetail.productInfo.description}</p>
              </div>
              {productDetail.productInfo.seller_message && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300/70">Sua resposta</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/80">{productDetail.productInfo.seller_message}</p>
                  {productDetail.productInfo.proposed_price_cents != null && (
                    <p className="mt-1.5 text-sm font-bold tracking-tight text-emerald-300">
                      {(productDetail.productInfo.proposed_price_cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  )}
                </div>
              )}
              <p className="text-[11px] text-white/45">
                Status: <span className="font-medium text-white/70">{productDetail.productInfo.status}</span>
              </p>
              <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-white/50">
                Pedidos de produto não têm chat contínuo. A negociação acontece pelos contatos trocados na resposta.
              </p>
            </div>
          </div>
        </div>
      )}
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
  const t = useTranslations("Messages")
  const active = actors.find((a) => a.id === actorId)
  if (loading) {
    return <Skeleton className="h-7 w-32 rounded-md" />
  }
  if (actors.length === 0) {
    return (
      <span className="text-[11px] text-white/40">
        {t("noActiveSubprofiles", "Sem subperfis ativos")}
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
            {active?.display_name || t("selectSubprofileLabel", "Selecionar")}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-white/60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-white/40">
          {t("actAsLabel", "Atuar como")}
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
              {a.display_name || t("noNameLabel", "Sem nome")}
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
  const t = useTranslations("Messages")
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <MessageCircle className="mb-3 h-10 w-10 text-white/30" />
      <p className="text-sm font-medium text-white">{t("noConversationsMessage", "Nenhuma conversa")}</p>
      <p className="mt-1 text-xs text-white/50">
        {t("noConversationsHint", "Abra um perfil e clique em \"Enviar mensagem\" para começar.")}
      </p>
    </div>
  )
}

function EmptyThread() {
  const t = useTranslations("Messages")
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/40">
      <MessageCircle className="mb-3 h-12 w-12" />
      <p className="text-sm">{t("selectConversationHint", "Selecione uma conversa para ler.")}</p>
    </div>
  )
}

function EmptyOsChats() {
  const t = useTranslations("Messages")
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <ClipboardList className="mb-3 h-10 w-10 text-white/30" />
      <p className="text-sm font-medium text-white">{t("noOsMessage", "Nenhuma O.S. ativa")}</p>
      <p className="mt-1 text-xs text-white/50">
        {t("noOsHint", "Quando um profissional responder uma das suas solicitações, ela aparece aqui.")}
      </p>
    </div>
  )
}

function EmptyOsThread() {
  const t = useTranslations("Messages")
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/40">
      <ClipboardList className="mb-3 h-12 w-12" />
      <p className="text-sm">{t("selectOsHint", "Selecione uma O.S. para abrir o chat.")}</p>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  shortLabel,
  dataTour,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  shortLabel: string
  dataTour?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={dataTour}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-[11px] font-medium uppercase tracking-wider transition-colors",
        active
          ? "border-b-2 border-primary text-white"
          : "border-b-2 border-transparent text-white/55 hover:text-white"
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{shortLabel}</span>
    </button>
  )
}

function EmptyMachinePick() {
  const t = useTranslations("Messages")
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white/40">
      <Sparkles className="mb-3 h-12 w-12" />
      <p className="text-sm">{t("selectMachineHint", "Selecione um enxame ao lado para entrar na sala.")}</p>
    </div>
  )
}

function MachineList({
  userMachines,
  allMachines,
  loading,
  activeId,
  onPick,
}: {
  userMachines: ChatMachine[]
  allMachines: ChatMachine[]
  loading: boolean
  activeId: number | null
  onPick: (id: number) => void
}) {
  const t = useTranslations("Messages")
  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    )
  }

  const ownIds = new Set(userMachines.map((m) => m.id_machine))
  const others = allMachines.filter((m) => !ownIds.has(m.id_machine))

  const renderItem = (m: ChatMachine, mine: boolean) => {
    const isActive = m.id_machine === activeId
    return (
      <li key={m.id_machine}>
        <button
          onClick={() => onPick(m.id_machine)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5",
            isActive && "bg-white/[0.06]"
          )}
        >
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: m.color_accent || "#888" }}
          />
          <span className={cn(
            "flex-1 truncate text-sm",
            isActive ? "text-white" : "text-white/85"
          )}>
            {m.name}
          </span>
          {mine && (
            <span className="shrink-0 rounded-sm bg-emerald-400/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
              {t("yourMachineLabel", "Sua")}
            </span>
          )}
        </button>
      </li>
    )
  }

  return (
    <div className="py-2">
      {userMachines.length > 0 && (
        <>
          <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/40">
            {t("yourMachinesSection", "Seus enxames")}
          </div>
          <ul className="divide-y divide-white/5">
            {userMachines.map((m) => renderItem(m, true))}
          </ul>
        </>
      )}
      {others.length > 0 && (
        <>
          <div className="mt-3 px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-white/40">
            {t("otherMachinesSection", "Outros enxames")}
          </div>
          <ul className="divide-y divide-white/5">
            {others.map((m) => renderItem(m, false))}
          </ul>
        </>
      )}
      {userMachines.length === 0 && others.length === 0 && (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center text-sm text-white/45">
          <Sparkles className="mb-2 h-8 w-8 text-white/30" />
          {t("noMachinesAvailable", "Nenhum enxame disponível.")}
        </div>
      )}
    </div>
  )
}
