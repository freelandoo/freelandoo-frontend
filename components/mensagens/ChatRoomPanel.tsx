"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  Flag,
  Loader2,
  Radio,
  Send,
  Trash2,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownText } from "@/components/ui/markdown-text"
import { useAuth } from "@/hooks/use-auth"
import { getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { EmojiPickerButton } from "./EmojiPickerButton"
import { ReportMessageDialog } from "./ReportMessageDialog"

const POLL_MS = 10_000
const HEARTBEAT_MS = 60_000
const MAX_LENGTH = 500
const SPRING = { type: "spring" as const, stiffness: 200, damping: 22 }

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
  hidden?: boolean
  hidden_reason?: string | null
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
  machineId?: number | null
  onNeedsMachinePick?: () => void
  pageTitle?: string
  pageSubtitle?: string
}

function authHeaders(): HeadersInit {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

function timeOnly(iso: string, locale: string = "pt-BR"): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
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
  const t = useTranslations("Conversation")
  const locale = useLocale()
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

  const machineRef = useRef<number | null>(machineId ?? null)
  useEffect(() => { machineRef.current = machineId ?? null }, [machineId])

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
          if (kind === "machine" && /m[aá]quina/i.test(data?.error || "")) {
            onNeedsMachinePick?.()
            if (!cancelled) {
              setJoining(false)
              setJoinError(null)
            }
            return
          }
          throw new Error(data?.error || t("joinRoomError", "Erro {status}").replace("{status}", String(res.status)))
        }
        if (cancelled) return
        setRoom(data.room)
        setOnline(data.room.current_users || 0)
        setConnState("online")
      } catch (e) {
        if (!cancelled) {
          setJoinError(e instanceof Error ? e.message : t("enterRoomError", "Erro ao entrar"))
          setConnState("reconnecting")
        }
      } finally {
        if (!cancelled) setJoining(false)
      }
    })()
    return () => { cancelled = true }
  }, [status, kind, machineId, onNeedsMachinePick, t])

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
    const t = setInterval(() => {
      if (!document.hidden) ping()
    }, HEARTBEAT_MS)
    return () => clearInterval(t)
  }, [room])

  useEffect(() => {
    return () => {
      if (!room) return
      try {
        fetch(`/api/chat/rooms/${room.id_chat_room}/leave`, {
          method: "POST",
          headers: authHeaders(),
          keepalive: true,
        })
      } catch { /* silent */ }
    }
  }, [room])

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
    const t = setInterval(() => {
      if (!document.hidden) loadMessages({ silent: true })
    }, POLL_MS)
    return () => clearInterval(t)
  }, [room, loadMessages])

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
        setSendError(data?.error || t("sendStatusError", "Erro {status}").replace("{status}", String(res.status)))
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
      setSendError(e instanceof Error ? e.message : t("sendMessageError", "Falha ao enviar"))
    } finally {
      setSending(false)
    }
  }

  const deleteMine = async (id: string) => {
    if (!room) return
    if (!confirm(t("deleteMessageConfirm", "Apagar essa mensagem?"))) return
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

  const [reportingId, setReportingId] = useState<string | null>(null)

  const openReport = (id: string) => setReportingId(id)

  const submitReport = async ({ reason_category, reason }: { reason_category: string; reason: string }) => {
    if (!reportingId) return
    const res = await fetch(`/api/chat/messages/${reportingId}/report`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ reason_category, reason }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw new Error(data?.error || t("reportSendError", "Não foi possível enviar a denúncia"))
    }
  }

  const roomTitle = useMemo(() => {
    if (!room) return kind === "global" ? t("globalRoomTitle", "Global") : t("machineRoomTitle", "Máquina")
    if (room.type === "global") return t("globalRoomTitle", "Global")
    return room.display_name || t("machineRoomTitle", "Máquina")
  }, [room, kind, t])

  const placeholder =
    kind === "global"
      ? t("globalChatPlaceholder", "Escreva no chat global...")
      : t("machineChatPlaceholder", "Converse com pessoas da sua máquina...")

  if (status !== "authenticated") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/60">
        {t("loginPromptChat", "Entre na sua conta para usar o chat ao vivo.")}
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
        <p>{t("connectionErrorTitle", "Não conseguimos conectar ao chat agora.")}</p>
        <p className="text-xs text-white/50">{joinError}</p>
        <button
          type="button"
          onClick={() => {
            setJoinError(null)
            setRoom(null)
            setJoining(true)
            setTimeout(() => {
              const dummy = machineRef.current
              machineRef.current = dummy
            }, 0)
          }}
          className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 hover:bg-white/5"
        >
          {t("retryButton", "Tentar de novo")}
        </button>
      </div>
    )
  }

  if (!room) return null

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Header glass */}
      <header className="relative flex flex-col gap-2 border-b border-white/[0.06] bg-gradient-to-b from-black/40 to-black/10 px-4 py-3 backdrop-blur-xl">
        {(pageTitle || pageSubtitle) && (
          <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
            {pageTitle}
          </div>
        )}
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ scale: connState === "online" ? [1, 1.15, 1] : 1 }}
            transition={connState === "online" ? { repeat: Infinity, duration: 2.2, ease: "easeInOut" } : { duration: 0.3 }}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              connState === "online"
                ? "bg-gradient-to-br from-emerald-400/25 to-emerald-500/10 text-emerald-300"
                : "bg-amber-400/15 text-amber-300"
            )}
          >
            <Radio className="h-4 w-4" />
          </motion.span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold tracking-tight text-white">{roomTitle}</h2>
            <p className="truncate text-[11px] text-white/50">
              {pageSubtitle ||
                (kind === "global"
                  ? t("globalChatDescription", "Converse com usuários online no Freelandoo.")
                  : t("machineChatDescription", "Converse com pessoas da sua área."))}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/75 backdrop-blur">
            <Users className="h-3.5 w-3.5 text-emerald-400" />
            <span className="tabular-nums">{online}</span>
            <span className="hidden text-white/40 sm:inline">{t("onlineText", "online")}</span>
          </div>
          <span
            className={cn(
              "hidden shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-block",
              connState === "online"
                ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                : connState === "reconnecting"
                  ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                  : "border-white/15 bg-white/5 text-white/55"
            )}
          >
            {connState === "online" ? t("liveStatus", "ao vivo") : connState === "reconnecting" ? t("reconnectingStatus", "reconectando") : t("connectingStatus", "conectando")}
          </span>
        </div>
      </header>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 [scrollbar-width:thin]"
      >
        {loadingMessages && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-white/55">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-white/10"
            >
              <Radio className="h-7 w-7 text-white/40" />
            </motion.div>
            <p className="text-sm text-white/60">
              {kind === "global"
                ? t("firstMessageGlobalHint", "Seja o primeiro a falar no chat global.")
                : t("firstMessageMachineHint", "Seja o primeiro a falar nessa máquina.")}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.map((m, idx) => {
                const mine = m.sender.id_user === user?.id_user
                const prev = messages[idx - 1]
                const sameSenderAsPrev = !!prev && prev.sender.id_user === m.sender.id_user
                const machine = m.profile?.machine?.name
                const level = m.profile?.xp_level || 0
                return (
                  <motion.li
                    key={m.id_chat_message}
                    layout="position"
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={SPRING}
                    className={cn(
                      "group/m flex items-end gap-2",
                      mine ? "flex-row-reverse" : "flex-row",
                      sameSenderAsPrev ? "mt-0" : "mt-1"
                    )}
                  >
                    {/* Avatar (só no último msg do cluster ou primeiro?) — para chat ao vivo, sempre exibir, mais informativo */}
                    {!mine ? (
                      <div className={cn("shrink-0", sameSenderAsPrev && "opacity-0")}>
                        {m.profile?.sub_profile_slug && m.sender.username ? (
                          <Link href={`/p/${m.sender.username}/${m.profile.sub_profile_slug}`} className="block">
                            <Avatar className="h-8 w-8 ring-1 ring-white/10">
                              <AvatarImage src={m.profile?.avatar_url || undefined} />
                              <AvatarFallback className="bg-neutral-800 text-[10px] text-white">
                                {entityInitials(m.profile?.display_name || m.sender.nome)}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                        ) : (
                          <Avatar className="h-8 w-8 ring-1 ring-white/10">
                            <AvatarImage src={m.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-neutral-800 text-[10px] text-white">
                              {entityInitials(m.profile?.display_name || m.sender.nome)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ) : (
                      <div className="w-0 shrink-0" />
                    )}

                    <div className={cn("max-w-[78%] min-w-0 flex flex-col", mine ? "items-end" : "items-start")}>
                      {!sameSenderAsPrev && (
                        <div className={cn("mb-0.5 flex items-center gap-1.5 px-1", mine ? "flex-row-reverse" : "flex-row")}>
                          {!mine && (
                            <span className="truncate text-[12px] font-semibold text-white">
                              {m.profile?.display_name || m.sender.nome || t("anonymousUser", "Anônimo")}
                            </span>
                          )}
                          {level > 0 && (
                            <span className="rounded-md bg-amber-400/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-amber-300">
                              {t("levelBadgeLabel", "LV.{n}").replace("{n}", String(level))}
                            </span>
                          )}
                          {machine && (
                            <span className="truncate rounded-md bg-white/[0.06] px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-white/65">
                              {machine}
                            </span>
                          )}
                        </div>
                      )}

                      {m.hidden ? (
                        <p className="inline-flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] italic text-white/45">
                          <Flag className="h-3 w-3" aria-hidden /> {t("messageHiddenLabel", "Mensagem ocultada por denúncias.")}
                        </p>
                      ) : (
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
                      )}
                      <div className={cn("mt-0.5 flex items-center gap-1.5 px-1", mine ? "flex-row-reverse" : "flex-row")}>
                        <span className="text-[10px] tabular-nums text-white/35">{timeOnly(m.created_at, locale)}</span>
                        {mine ? (
                          <button
                            type="button"
                            onClick={() => deleteMine(m.id_chat_message)}
                            aria-label={t("deleteMessageAriaLabel", "Apagar")}
                            title={t("deleteMessageAriaLabel", "Apagar")}
                            className="rounded p-0.5 text-white/30 opacity-0 transition-all hover:text-red-300 group-hover/m:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openReport(m.id_chat_message)}
                            aria-label={t("reportMessageAriaLabel", "Denunciar")}
                            title={t("reportMessageAriaLabel", "Denunciar")}
                            className="rounded p-0.5 text-white/30 opacity-0 transition-all hover:text-amber-300 group-hover/m:opacity-100"
                          >
                            <Flag className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.li>
                )
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Composer — sticky no fundo, respeita safe-area mobile */}
      <div className="shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black/60 to-black/20 px-3 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur-xl sm:px-4">
        <AnimatePresence>
          {sendError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={SPRING}
              className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[12px] text-red-200"
            >
              {sendError}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] focus-within:border-yellow-400/40 focus-within:bg-white/[0.05]">
          <EmojiPickerButton onPick={insertEmoji} />
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
            className="min-h-[40px] max-h-32 flex-1 resize-none border-0 bg-transparent text-sm text-white placeholder:text-white/35 focus-visible:ring-0"
          />
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            whileTap={{ scale: 0.94 }}
            transition={SPRING}
            aria-label={t("sendMessageAriaLabel", "Enviar")}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-neutral-950 shadow-[0_8px_20px_-8px_rgba(250,204,21,0.55)] transition disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </motion.button>
        </div>
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-white/30">
          <span className="hidden sm:inline">{t("sendKeysHintDesktop", "Enter envia · Shift+Enter quebra linha")}</span>
          <span className="sm:hidden">{t("sendKeysHintMobile", "Enter envia")}</span>
          <span className="tabular-nums">{draft.length}/{MAX_LENGTH}</span>
        </div>
      </div>

      <ReportMessageDialog
        open={reportingId !== null}
        onOpenChange={(open) => { if (!open) setReportingId(null) }}
        onSubmit={submitReport}
      />
    </div>
  )
}
