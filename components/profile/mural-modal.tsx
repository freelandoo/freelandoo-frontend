"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ServiceChatModal } from "@/components/profile/service-chat-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Loader2, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  MessageCircle, Clock, Megaphone, AlertCircle,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface MuralRequest {
  id_request: string
  description: string
  machine_name?: string
  category_name?: string
  estado?: string
  municipio?: string
  user_name?: string
  user_avatar?: string
  created_at: string
}

interface ActiveConversation {
  id_response: string
  id_request: string
  user_name?: string
  user_avatar?: string
  description?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
  created_at?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}
function headers(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}
function initials(name: string) {
  if (!name) return "?"
  const p = name.split(" ")
  return p[0][0] + (p[1]?.[0] || "")
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function MuralModal({ open, onOpenChange, profileId }: Props) {
  const [tab, setTab] = useState<"new" | "active">("new")
  const [muralItems, setMuralItems] = useState<MuralRequest[]>([])
  const [conversations, setConversations] = useState<ActiveConversation[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // --- chat ---
  const [chatOpen, setChatOpen] = useState(false)
  const [chatIdResponse, setChatIdResponse] = useState("")
  const [chatPeerName, setChatPeerName] = useState("")
  const [chatPeerAvatar, setChatPeerAvatar] = useState<string | undefined>()

  // Mark mural as seen when opening
  useEffect(() => {
    if (!open) return
    const token = getToken()
    if (!token) return
    fetch("/api/service-requests/mural/mark-seen", {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ id_profile: profileId }),
    }).catch(() => {})
  }, [open, profileId])

  // Fetch mural data
  const fetchData = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/service-requests/mural?id_profile=${encodeURIComponent(profileId)}`, {
        headers: headers(token),
      })
      if (res.ok) {
        const data = await res.json()
        // Backend may return { requests: [...] }, { items: [...] }, or an array.
        if (Array.isArray(data.requests)) {
          setMuralItems(data.requests)
        } else if (Array.isArray(data.items)) {
          setMuralItems(data.items)
        } else if (Array.isArray(data)) {
          setMuralItems(data)
        } else {
          setMuralItems([])
        }
        if (data.conversations) {
          setConversations(Array.isArray(data.conversations) ? data.conversations : [])
        }
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [profileId])

  useEffect(() => {
    if (!open) return
    const timeout = window.setTimeout(() => {
      void fetchData()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [open, fetchData])

  const handleRespond = async (idRequest: string, action: "accept" | "reject") => {
    if (action === "reject" && !confirm("Rejeitar esta solicitação?")) return
    const token = getToken()
    if (!token) return
    setActionLoading(idRequest)
    try {
      const res = await fetch(`/api/service-requests/${idRequest}/respond`, {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({ id_profile: profileId, action }),
      })
      if (res.ok) {
        fetchData()
      } else {
        const d = await res.json().catch(() => ({}))
        alert((d as { error?: string }).error || "Erro ao responder")
      }
    } catch {
      alert("Erro de rede")
    }
    setActionLoading(null)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Mural de Serviços
          </DialogTitle>
          <DialogDescription>Solicitações de serviço que combinam com seu perfil.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-0">
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "new" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Solicitações novas
          </button>
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors relative ${tab === "active" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Conversas ativas
            {conversations.some(c => (c.unread_count ?? 0) > 0) && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ========== TAB: SOLICITAÇÕES NOVAS ========== */}
          {!loading && tab === "new" && (
            <div className="space-y-3 py-2">
              {muralItems.length === 0 && (
                <div className="text-center py-12">
                  <Megaphone className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">Nenhuma solicitação nova</p>
                  <p className="text-sm text-muted-foreground">Quando alguém pedir um serviço compatível, aparecerá aqui.</p>
                </div>
              )}

              {muralItems.map(req => {
                const isExp = expanded === req.id_request
                return (
                  <div key={req.id_request} className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setExpanded(isExp ? null : req.id_request)}
                    >
                      <Avatar className="h-9 w-9 shrink-0">
                        {req.user_avatar && <AvatarImage src={req.user_avatar} alt={req.user_name || ""} />}
                        <AvatarFallback className="text-xs">{initials(req.user_name || "?")}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{req.user_name || "Usuário"}</span>
                          <span className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-0.5" />
                            {new Date(req.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {req.machine_name && <Badge variant="outline" className="text-[10px] py-0 h-5">{req.machine_name}</Badge>}
                          {req.category_name && <Badge variant="secondary" className="text-[10px] py-0 h-5">{req.category_name}</Badge>}
                          {req.municipio && <span className="text-[10px] text-muted-foreground">📍 {req.municipio}{req.estado ? `, ${req.estado}` : ""}</span>}
                        </div>
                      </div>
                      {isExp ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>

                    {isExp && (
                      <div className="border-t bg-muted/20 p-3 space-y-3">
                        <p className="text-sm whitespace-pre-wrap">{req.description}</p>
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 border-red-200 hover:border-red-300"
                            onClick={() => handleRespond(req.id_request, "reject")}
                            disabled={actionLoading === req.id_request}
                          >
                            {actionLoading === req.id_request ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                            Rejeitar
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleRespond(req.id_request, "accept")}
                            disabled={actionLoading === req.id_request}
                          >
                            {actionLoading === req.id_request ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            Aceitar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ========== TAB: CONVERSAS ATIVAS ========== */}
          {!loading && tab === "active" && (
            <div className="space-y-2 py-2">
              {conversations.length === 0 && (
                <div className="text-center py-12">
                  <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">Nenhuma conversa ativa</p>
                  <p className="text-sm text-muted-foreground">Aceite solicitações para iniciar conversas.</p>
                </div>
              )}

              {conversations.map(conv => (
                <button
                  key={conv.id_response}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  onClick={() => {
                    setChatIdResponse(conv.id_response)
                    setChatPeerName(conv.user_name || "Usuário")
                    setChatPeerAvatar(conv.user_avatar)
                    setChatOpen(true)
                  }}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      {conv.user_avatar && <AvatarImage src={conv.user_avatar} alt={conv.user_name || ""} />}
                      <AvatarFallback className="text-xs">{initials(conv.user_name || "?")}</AvatarFallback>
                    </Avatar>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">{conv.user_name || "Usuário"}</span>
                    {conv.last_message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{conv.last_message}</p>
                    )}
                  </div>
                  <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Chat modal — pro side */}
    <ServiceChatModal
      open={chatOpen}
      onOpenChange={(v) => { setChatOpen(v); if (!v) fetchData() }}
      idResponse={chatIdResponse}
      peerName={chatPeerName}
      peerAvatar={chatPeerAvatar}
      viewerSide="PRO"
    />
    </>
  )
}
