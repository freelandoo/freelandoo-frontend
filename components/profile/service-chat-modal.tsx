"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Loader2, Send, Lock, CheckCircle2, ArrowLeft } from "lucide-react"

interface Message {
  id_message: string
  sender: "USER" | "PRO"
  content: string
  created_at: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  idResponse: string
  peerName: string
  peerAvatar?: string
  /** Which side is the current viewer: "USER" sees PRO bubbles left, "PRO" sees USER bubbles left */
  viewerSide: "USER" | "PRO"
  /** Status of the response — blocks input if terminal */
  responseStatus?: string
  /** Only shown for USER side in PRO_ACCEPTED status */
  idRequest?: string
  onFinalize?: () => void
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

const TERMINAL = ["PRO_REJECTED", "USER_REJECTED", "FINALIZED", "CLOSED_OTHER_WON"]

export function ServiceChatModal({
  open, onOpenChange, idResponse, peerName, peerAvatar,
  viewerSide, responseStatus, idRequest, onFinalize,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isTerminal = TERMINAL.includes(responseStatus || "")

  const fetchMessages = useCallback(async () => {
    const token = getToken()
    if (!token || !idResponse) return
    try {
      const res = await fetch(`/api/service-requests/responses/${encodeURIComponent(idResponse)}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : data.messages ?? [])
      }
    } catch { /* silent */ }
  }, [idResponse])

  // Initial fetch + polling 10s
  useEffect(() => {
    if (!open) return
    setMessages([])
    setLoading(true)
    fetchMessages().finally(() => setLoading(false))
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [open, fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  // Focus input on open
  useEffect(() => {
    if (open && !isTerminal) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [open, isTerminal])

  const handleSend = async () => {
    const content = text.trim()
    if (!content || sending) return
    const token = getToken()
    if (!token) return
    setSending(true)
    try {
      const res = await fetch(`/api/service-requests/responses/${encodeURIComponent(idResponse)}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        setText("")
        await fetchMessages()
      }
    } catch { /* silent */ }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFinalize = async () => {
    if (!idRequest || !confirm("Aceitar este profissional e fechar o serviço? Os demais serão encerrados.")) return
    const token = getToken()
    if (!token) return
    setFinalizing(true)
    try {
      const res = await fetch(`/api/service-requests/${idRequest}/finalize-response/${idResponse}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (res.ok) {
        onFinalize?.()
        onOpenChange(false)
      } else {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error || "Erro ao finalizar")
      }
    } catch { alert("Erro de rede") }
    setFinalizing(false)
  }

  const initials = (name: string) => {
    if (!name) return "?"
    const p = name.split(" ")
    return p[0][0] + (p[1]?.[0] || "")
  }

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    } catch { return "" }
  }

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("pt-BR") } catch { return "" }
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  messages.forEach(msg => {
    const d = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (last && last.date === d) {
      last.msgs.push(msg)
    } else {
      grouped.push({ date: d, msgs: [msg] })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 flex flex-col max-h-[85vh] gap-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-9 w-9 shrink-0">
            {peerAvatar && <AvatarImage src={peerAvatar} alt={peerName} />}
            <AvatarFallback className="text-xs">{initials(peerName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{peerName}</p>
            {isTerminal && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Conversa encerrada
              </p>
            )}
          </div>
          {/* Finalize button — user side only, non-terminal */}
          {viewerSide === "USER" && !isTerminal && idRequest && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 text-xs gap-1"
              onClick={handleFinalize}
              disabled={finalizing}
            >
              {finalizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              Aceitar
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-[200px] max-h-[60vh]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma mensagem ainda. Inicie a conversa!
            </div>
          )}
          {grouped.map(group => (
            <React.Fragment key={group.date}>
              <div className="flex justify-center my-3">
                <span className="text-[10px] text-muted-foreground bg-muted px-3 py-0.5 rounded-full">{group.date}</span>
              </div>
              {group.msgs.map(msg => {
                const isMine = msg.sender === viewerSide
                return (
                  <div key={msg.id_message} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words whitespace-pre-wrap ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"} text-right`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </React.Fragment>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Footer */}
        <div className="border-t px-3 py-2.5 bg-background">
          {isTerminal ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Conversa encerrada
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-9"
                disabled={sending}
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0 shrink-0"
                onClick={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
