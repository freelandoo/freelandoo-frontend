"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Loader2, Send, Lock, CheckCircle2, XCircle, ArrowLeft } from "lucide-react"

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
  onReject?: () => void
  /** Preview mode (PRO side, ainda não respondeu): mostra Aceitar/Rejeitar no header
   *  e bloqueia input até aceitar. Quando aceitar, cria response e vira chat normal. */
  previewRequest?: {
    idRequest: string
    idProfile: string
    description: string
    machineName?: string
    categoryName?: string
    estado?: string
    municipio?: string
  }
  onPreviewAccepted?: (idResponse: string) => void
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

const TERMINAL = ["PRO_REJECTED", "USER_REJECTED", "FINALIZED", "CLOSED_OTHER_WON"]

export function ServiceChatModal({
  open, onOpenChange, idResponse, peerName, peerAvatar,
  viewerSide, responseStatus, idRequest, onFinalize, onReject,
  previewRequest, onPreviewAccepted,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  // Só USER decide (finalize/reject) — PRO apenas conversa
  const [confirmType, setConfirmType] = useState<"finalize" | "reject" | null>(null)
  // Quando abre via mural cria PENDING e guardamos o id local até o caller atualizar a prop
  const [acceptedIdResponse, setAcceptedIdResponse] = useState<string>("")
  // Status corrente, atualizado via /messages (que devolve `response`)
  const [currentStatus, setCurrentStatus] = useState<string>(responseStatus || "")
  const [opening, setOpening] = useState(false)
  const [lockedByOther, setLockedByOther] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const openingRef = useRef(false)
  const previewAcceptedRef = useRef(onPreviewAccepted)
  useEffect(() => { previewAcceptedRef.current = onPreviewAccepted }, [onPreviewAccepted])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const effectiveIdResponse = idResponse || acceptedIdResponse
  const effectiveStatus = currentStatus || responseStatus || ""
  const isTerminal = TERMINAL.includes(effectiveStatus)

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
       
      setAcceptedIdResponse("")
      setCurrentStatus("")
      setLockedByOther(false)
      setOpenError(null)
      openingRef.current = false
    } else {
       
      setCurrentStatus(responseStatus || "")
      setOpenError(null)
    }
  }, [open, responseStatus])

  // Ao abrir via mural (preview), cria response PENDING para liberar o chat.
  // Se outro sub-perfil já travou a O.S., backend devolve 409 + locked_by_other.
  useEffect(() => {
    if (!open || !previewRequest || effectiveIdResponse) return
    if (openingRef.current) return
    const token = getToken()
    if (!token) return
    openingRef.current = true
     
    setOpening(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/service-requests/${previewRequest.idRequest}/respond`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id_profile: previewRequest.idProfile, action: "open" }),
        })
        const d = await res.json().catch(() => ({}))
        if (res.ok) {
          const newId = (d as { response?: { id_response: string; status?: string } }).response?.id_response
          const newStatus = (d as { response?: { status?: string } }).response?.status
          if (newId) {
            setAcceptedIdResponse(newId)
            if (newStatus) setCurrentStatus(newStatus)
            previewAcceptedRef.current?.(newId)
          }
        } else if (res.status === 409 && (d as { locked_by_other?: boolean }).locked_by_other) {
          setLockedByOther(true)
        } else {
          setLockedByOther(false)
          const msg = (d as { error?: string }).error || `Erro ao abrir o chat (HTTP ${res.status}).`
          setOpenError(msg)
        }
      } catch {
        setOpenError("Erro de rede ao abrir o chat.")
      }
      setOpening(false)
      openingRef.current = false
    })()
  }, [open, previewRequest, effectiveIdResponse])

  const fetchMessages = useCallback(async () => {
    const token = getToken()
    if (!token || !effectiveIdResponse) return
    try {
      const res = await fetch(`/api/service-requests/responses/${encodeURIComponent(effectiveIdResponse)}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : data.messages ?? [])
        const respStatus = (data as { response?: { status?: string } }).response?.status
        if (respStatus) setCurrentStatus(respStatus)
      }
    } catch { /* silent */ }
  }, [effectiveIdResponse])

  // Initial fetch + polling 10s
  useEffect(() => {
    if (!open) return
     
    setMessages([])
    if (!effectiveIdResponse) return
     
    setLoading(true)
    fetchMessages().finally(() => setLoading(false))
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [open, effectiveIdResponse, fetchMessages])

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
      const res = await fetch(`/api/service-requests/responses/${encodeURIComponent(effectiveIdResponse)}/messages`, {
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
    if (!idRequest) return
    const token = getToken()
    if (!token) return
    setFinalizing(true)
    try {
      const res = await fetch(`/api/service-requests/${idRequest}/finalize-response/${effectiveIdResponse}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (res.ok) {
        setConfirmType(null)
        onFinalize?.()
        onOpenChange(false)
      } else {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error || "Erro ao finalizar")
      }
    } catch { alert("Erro de rede") }
    setFinalizing(false)
  }

  const handleReject = async () => {
    if (!idRequest) return
    const token = getToken()
    if (!token) return
    setRejecting(true)
    try {
      const res = await fetch(`/api/service-requests/${idRequest}/reject-response/${effectiveIdResponse}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      })
      if (res.ok) {
        setConfirmType(null)
        onReject?.()
        onOpenChange(false)
      } else {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error || "Erro ao rejeitar")
      }
    } catch { alert("Erro de rede") }
    setRejecting(false)
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
    <>
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
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 min-h-[200px] max-h-[60vh]">
          {/* Card com detalhes da solicitação (mostrado quando vem do mural) */}
          {previewRequest && (
            <div className="bg-muted/50 border rounded-lg p-3 space-y-2 mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Solicitação de serviço
              </p>
              <div className="flex flex-wrap gap-1.5">
                {previewRequest.machineName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-background border">
                    {previewRequest.machineName}
                  </span>
                )}
                {previewRequest.categoryName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-secondary text-secondary-foreground">
                    {previewRequest.categoryName}
                  </span>
                )}
                {previewRequest.municipio && (
                  <span className="text-[10px] text-muted-foreground">
                    📍 {previewRequest.municipio}{previewRequest.estado ? `, ${previewRequest.estado}` : ""}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{previewRequest.description}</p>
            </div>
          )}
          {(loading || opening) && messages.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && !opening && !lockedByOther && messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-xs">
              {viewerSide === "PRO"
                ? "Mande uma mensagem para iniciar a negociação."
                : "Nenhuma mensagem ainda."}
            </div>
          )}
          {lockedByOther && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-2">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Alguém já respondeu a essa solicitação</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Aguarde — se o usuário rejeitar a outra resposta, a O.S. fica disponível para você.
              </p>
            </div>
          )}
          {openError && !lockedByOther && (
            <div className="flex flex-col items-center justify-center text-center py-12 px-4 gap-2">
              <Lock className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">Não foi possível abrir o chat</p>
              <p className="text-xs text-muted-foreground max-w-xs">{openError}</p>
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
        <div className="border-t bg-background">
          {/* Botões de decisão — só o USER decide (Aceitar/Rejeitar) */}
          {!isTerminal && !lockedByOther && viewerSide === "USER" && idRequest && (
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs gap-1"
                onClick={() => setConfirmType("reject")}
                disabled={finalizing || rejecting}
              >
                <XCircle className="h-3.5 w-3.5" />
                Rejeitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 text-xs gap-1"
                onClick={() => setConfirmType("finalize")}
                disabled={finalizing || rejecting}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Aceitar
              </Button>
            </div>
          )}

          {/* Input ou aviso de encerrada */}
          <div className="px-3 py-2.5">
            {isTerminal ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Conversa encerrada
              </div>
            ) : lockedByOther ? (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Aguarde a decisão do usuário
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
                  disabled={sending || !effectiveIdResponse}
                />
                <Button
                  size="sm"
                  className="h-9 w-9 p-0 shrink-0"
                  onClick={handleSend}
                  disabled={!text.trim() || sending || !effectiveIdResponse}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Modal de confirmação Aceitar / Rejeitar */}
    <Dialog open={!!confirmType} onOpenChange={(v) => { if (!v) setConfirmType(null) }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {confirmType === "finalize" && "Aceitar este profissional?"}
            {confirmType === "reject" && "Rejeitar este profissional?"}
          </DialogTitle>
          <DialogDescription>
            {confirmType === "finalize" && "Você está aceitando esse serviço. Você não receberá mais freelancers para essa O.S. e as outras conversas serão encerradas. Confirma?"}
            {confirmType === "reject" && "A conversa com este profissional será encerrada. Outros profissionais ainda podem responder à sua O.S."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => setConfirmType(null)} disabled={finalizing || rejecting}>
            Cancelar
          </Button>
          <Button
            className={
              confirmType === "finalize"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }
            onClick={() => {
              if (confirmType === "finalize") handleFinalize()
              else if (confirmType === "reject") handleReject()
            }}
            disabled={finalizing || rejecting}
          >
            {(finalizing || rejecting) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
