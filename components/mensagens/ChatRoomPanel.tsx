"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Flag,
  Loader2,
  Radio,
  Send,
  Trash2,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { EmojiPickerButton } from "./EmojiPickerButton"

const POLL_MS = 3500
const HEARTBEAT_MS = 30_000
const MAX_LENGTH = 500

export type ChatRoomKind = "global" | "machine"

export interface ChatMachine {
  id_machine: number
  name: string
  slug: string
  color_accent: string | null
}

interface ChatRoom {
  id_chat_room: string
  type: ChatRoomKind
  id_machine: number | null
  instance_number: number
  max_users: number
  display_name: string | null
  current_users?: number
}

interface ChatMessage {
  id_chat_message: string
  content: string
  message_type: string
  created_at: string
  sender: {
    id_user: string
    username: string | null
    nome: string | null
  }
  profile: {
    id_profile: string
    display_name: string | null
    avatar_url: string | null
    sub_profile_slug: string | null
    xp_level: number
    machine: { id_machine: number; name: string; slug: string } | null
  } | null
}

interface ChatRoomPanelProps {
  kind: ChatRoomKind
  /** Para kind=machine: máquina explícita selecionada pelo user. */
  machineId?: number | null
  /** Callback quando precisar exibir o seletor de máquina (kind=machine sem
   *  máquina principal e sem id explícito). */
  onNeedsMachinePick?: () => void
  /** Cabeçalho descritivo opcional (acima do título da sala). */
  pageTitle?: string
  pageSubtitle?: string
}

function authHeaders(): HeadersInit {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function timeOnly(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

function entityInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

export function ChatRoomPanel({
  kind,
  machineId,
  onNeedsMachinePick,
  pageTitle,
  pageSubtitle,
}: ChatRoomPanelProps) {
  const { user, status } = useAuth()
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [online, setOnline] = useState(0)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [connState, setConnState] = useState<"connecting" | "online" | "reconnecting">("connecting")

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)

  // Mantém referência da máquina solicitada para reconectar se a sala morrer
  const machineRef = useRef<number | null>(machineId ?? null)
  useEffect(() => { machineRef.current = machineId ?? null }, [machineId])

  // Entrar na sala (idempotente — chama sempre que kind/machineId muda)
  useEffect(() => {
    if (status !== "authenticated") return
    let cancelled = false
    setRoom(null)
    setMessages([])
    setJoinError(null)
    setJoining(true)
    setConnState("connecting")
    ;(async () => {
      try {
        const res = await fetch("/api/chat/join", {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ type: kind, id_machine: machineId ?? undefined }),
        })
        const data = await res.json()
        if (!res.ok) {
          // Caso especial: máquina ambígua/ausente → frontend mostra seletor
          if (kind === "machine" && /m[aá]quina/i.test(data?.error || "")) {
            onNeedsMachinePick?.()
            if (!cancelled) {
              setJoining(false)
              setJoinError(null)
            }
            return
          }
          throw new Error(data?.error || `Erro ${res.status}`)
        }
        if (cancelled) return
        setRoom(data.room)
        setOnline(data.room.current_users || 0)
        setConnState("online")
      } catch (e) {
        if (!cancelled) {
          setJoinError(e instanceof Error ? e.message : "Erro ao entrar")
          setConnState("reconnecting")
        }
      } finally {
        if (!cancelled) setJoining(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, kind, machineId, onNeedsMachinePick])

  // Mantém presença viva
  useEffect(() => {
    if (!room) return
    const ping = async () => {
      try {
        const res = await fetch(`/api/chat/rooms/${room.id_chat_room}/heartbeat`, {
          method: "POST",
          headers: authHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          if (typeof data?.current_users === "number") setOnline(data.current_users)
          setConnState("online")
        } else {
          setConnState("reconnecting")
        }
      } catch {
        setConnState("reconnecting")
      }
    }
    const t = setInterval(ping, HEARTBEAT_MS)
    return () => clearInterval(t)
  }, [room])

  // Sai da sala ao desmontar / mudar de aba (fire-and-forget)
  useEffect(() => {
    return () => {
      if (!room) return
      // sendBeacon dá maior chance de chegar no unload, mas não dá pra setar
      // Authorization. Usa fetch keepalive como fallback (também envia no unload).
      try {
        fetch(`/api/chat/rooms/${room.id_chat_room}/leave`, {
          method: "POST",
          headers: authHeaders(),
          keepalive: true,
        })
      } catch { /* silent */ }
    }
  }, [room])

  // Beforeunload: best effort sair da sala
  useEffect(() => {
    if (!room) return
    const onBeforeUnload = () => {
      try {
        fetch(`/api/chat/rooms/${room.id_chat_room}/leave`, {
          method: "POST",
          headers: authHeaders(),
          keepalive: true,
        })
      } catch { /* silent */ }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [room])

  // Carga inicial + polling de mensagens
  const loadMessages = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!room) return
    if (!opts.silent) setLoadingMessages(true)
    try {
      const res = await fetch(
        `/api/chat/rooms/${room.id_chat_room}/messages?limit=50`,
        { headers: authHeaders(), cache: "no-store" }
      )
      if (!res.ok) {
        setConnState("reconnecting")
        return
      }
      const data = await res.json()
      const next: ChatMessage[] = Array.isArray(data?.items) ? [...data.items].reverse() : []
      setMessages(next)
      if (typeof data?.current_users === "number") setOnline(data.current_users)
      setConnState("online")
    } catch {
      setConnState("reconnecting")
    } finally {
      if (!opts.silent) setLoadingMessages(false)
    }
  }, [room])

  useEffect(() => {
    if (!room) return
    loadMessages()
  }, [room, loadMessages])

  useEffect(() => {
    if (!room) return
    const t = setInterval(() => loadMessages({ silent: true }), POLL_MS)
    return () => clearInterval(t)
  }, [room, loadMessages])

  // Auto-scroll inteligente
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages.length])

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distance < 80
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) {
      setDraft((d) => (d + emoji).slice(0, MAX_LENGTH))
      return
    }
    const start = el.selectionStart ?? draft.length
    const end = el.selectionEnd ?? draft.length
    const next = (draft.slice(0, start) + emoji + draft.slice(end)).slice(0, MAX_LENGTH)
    setDraft(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + emoji.length
      try { el.setSelectionRange(pos, pos) } catch { /* noop */ }
    })
  }

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || sending || !room) return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch(`/api/chat/rooms/${room.id_chat_room}/messages`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data?.error || `Erro ${res.status}`)
        return
      }
      setDraft("")
      if (data?.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id_chat_message === data.message.id_chat_message)) return prev
          return [...prev, data.message]
        })
        stickToBottomRef.current = true
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Falha ao enviar")
    } finally {
      setSending(false)
    }
  }

  const deleteMine = async (id: string) => {
    if (!room) return
    if (!confirm("Apagar essa mensagem?")) return
    try {
      const res = await fetch(`/api/chat/messages/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id_chat_message !== id))
      }
    } catch { /* silent */ }
  }

  const reportMessage = async (id: string) => {
    const reason = prompt("Motivo da denúncia (opcional):")
    if (reason === null) return
    try {
      const res = await fetch(`/api/chat/messages/${id}/report`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        alert("Denúncia enviada.")
      } else {
        const data = await res.json().catch(() => null)
        alert(data?.error || "Não foi possível enviar a denúncia.")
      }
    } catch {
      alert("Erro de rede ao denunciar.")
    }
  }

  const roomTitle = useMemo(() => {
    if (!room) return kind === "global" ? "Global" : "Máquina"
    if (room.type === "global") return "Global"
    return room.display_name || "Máquina"
  }, [room, kind])

  const placeholder =
    kind === "global"
      ? "Escreva no chat global..."
      : "Converse com pessoas da sua máquina..."

  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/60">
        Entre na sua conta para usar o chat ao vivo.
      </div>
    )
  }

  if (joining && !room) {
    return (
      <div className="flex flex-1 items-center justify-center text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (joinError && !room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-red-300">
        <p>Não conseguimos conectar ao chat agora.</p>
        <p className="text-xs text-white/50">{joinError}</p>
        <button
          type="button"
          onClick={() => {
            // re-trigger pelo state truque
            setJoinError(null)
            setRoom(null)
            setJoining(true)
            // a effect de join roda de novo porque dependências [kind, machineId] não mudaram —
            // forçamos via setTimeout num re-render dummy:
            setTimeout(() => {
              const dummy = machineRef.current
              machineRef.current = dummy
            }, 0)
          }}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/5"
        >
          Tentar de novo
        </button>
      </div>
    )
  }

  if (!room) {
    // Caso máquina precise ser escolhida — o pai trata isso via onNeedsMachinePick.
    return null
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex flex-col gap-2 border-b border-white/[0.07] bg-black/30 px-4 py-3 backdrop-blur">
        {(pageTitle || pageSubtitle) && (
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            {pageTitle}
          </div>
        )}
        <div className="flex items-center gap-3">
          <Radio
            className={cn(
              "h-4 w-4 shrink-0",
              connState === "online" ? "text-emerald-400" : "text-amber-300"
            )}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-white">{roomTitle}</h2>
            <p className="truncate text-[11px] text-white/55">
              {pageSubtitle ||
                (kind === "global"
                  ? "Converse com usuários online no Freelandoo."
                  : "Converse com pessoas da sua área.")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-neutral-900/70 px-2.5 py-1 text-[11px] text-white/75">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            <span className="tabular-nums">{online}</span>
            <span className="text-white/40">online</span>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              connState === "online"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : connState === "reconnecting"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-white/15 bg-white/5 text-white/55"
            )}
          >
            {connState === "online" ? "ao vivo" : connState === "reconnecting" ? "reconectando" : "conectando"}
          </span>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-3 sm:px-4"
      >
        {loadingMessages && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/55">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center text-white/50">
            <Radio className="mb-2 h-8 w-8 text-white/30" />
            <p className="text-sm">
              {kind === "global"
                ? "Seja o primeiro a falar no chat global."
                : "Seja o primeiro a falar nessa máquina."}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const mine = m.sender.id_user === user?.id_user
              const machine = m.profile?.machine?.name
              const level = m.profile?.xp_level || 0
              return (
                <li
                  key={m.id_chat_message}
                  className="group/m flex items-start gap-2.5"
                >
                  {m.profile?.sub_profile_slug && m.sender.username ? (
                    <Link
                      href={`/p/${m.sender.username}/${m.profile.sub_profile_slug}`}
                      className="shrink-0"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-neutral-800 text-[10px] text-white">
                          {entityInitials(m.profile?.display_name || m.sender.nome)}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-neutral-800 text-[10px] text-white">
                        {entityInitials(m.profile?.display_name || m.sender.nome)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-semibold text-white">
                        {m.profile?.display_name || m.sender.nome || "Anônimo"}
                      </span>
                      {level > 0 && (
                        <span className="rounded-sm bg-amber-400/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-300">
                          LV.{level}
                        </span>
                      )}
                      {machine && (
                        <span className="truncate rounded-sm bg-white/[0.06] px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-white/65">
                          {machine}
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[10px] tabular-nums text-white/40">
                        {timeOnly(m.created_at)}
                      </span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90">
                      {m.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/m:opacity-100">
                    {mine ? (
                      <button
                        type="button"
                        onClick={() => deleteMine(m.id_chat_message)}
                        aria-label="Apagar"
                        title="Apagar"
                        className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => reportMessage(m.id_chat_message)}
                        aria-label="Denunciar"
                        title="Denunciar"
                        className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-amber-300"
                      >
                        <Flag className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-white/10 px-3 py-3">
        {sendError && (
          <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-200">
            {sendError}
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="min-h-[40px] max-h-32 resize-none border-white/10 bg-neutral-900 text-sm text-white placeholder:text-white/40"
          />
          <EmojiPickerButton onPick={insertEmoji} />
          <Button
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label="Enviar"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-white/35">
          <span>Enter envia · Shift+Enter quebra linha</span>
          <span className="tabular-nums">{draft.length}/{MAX_LENGTH}</span>
        </div>
      </div>
    </div>
  )
}
