"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ServiceChatModal } from "@/components/profile/service-chat-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import {
  MessageSquarePlus, Loader2, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, MessageCircle, Clock, Ban, AlertCircle,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */
interface ResponseItem {
  id_response: string
  id_profile: string
  status: string
  display_name?: string
  avatar_url?: string
  machine_name?: string
  category_name?: string
  last_message?: string
  last_message_at?: string
  unread_count?: number
  created_at?: string
}

interface ServiceRequest {
  id_request: string
  id_machine: number
  id_category: number
  machine_name?: string
  category_name?: string
  estado?: string
  municipio?: string
  description: string
  status: string
  created_at: string
  responses?: ResponseItem[]
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
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
const statusLabel: Record<string, { text: string; color: string }> = {
  OPEN: { text: "Aberta", color: "bg-green-600" },
  FULFILLED: { text: "Finalizada", color: "bg-blue-600" },
  CANCELED: { text: "Cancelada", color: "bg-gray-500" },
}
const respLabel: Record<string, { text: string; color: string }> = {
  PRO_ACCEPTED: { text: "Aguardando", color: "bg-amber-500" },
  PRO_REJECTED: { text: "Pro rejeitou", color: "bg-red-500" },
  USER_REJECTED: { text: "Você rejeitou", color: "bg-gray-500" },
  FINALIZED: { text: "Aceito ✓", color: "bg-green-600" },
  CLOSED_OTHER_WON: { text: "Encerrado", color: "bg-gray-500" },
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function ServiceRequestModal({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<"new" | "list">("list")

  // --- chat ---
  const [chatOpen, setChatOpen] = useState(false)
  const [chatIdResponse, setChatIdResponse] = useState("")
  const [chatIdRequest, setChatIdRequest] = useState("")
  const [chatPeerName, setChatPeerName] = useState("")
  const [chatPeerAvatar, setChatPeerAvatar] = useState<string | undefined>()
  const [chatRespStatus, setChatRespStatus] = useState("")

  // --- create form ---
  const [machines, setMachines] = useState<{ id_machine: number; name: string }[]>([])
  const [professions, setProfessions] = useState<{ id_category: number; desc_category: string }[]>([])
  const [loadingM, setLoadingM] = useState(false)
  const [loadingP, setLoadingP] = useState(false)
  const [isLocal, setIsLocal] = useState(false)
  const [form, setForm] = useState({ id_machine: "", id_category: "", estado: "", municipio: "", description: "" })
  const [municipios, setMunicipios] = useState<{ id: number; nome: string }[]>([])
  const [loadingMun, setLoadingMun] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // --- list ---
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const estados = ESTADOS_BRASIL

  // Fetch machines
  useEffect(() => {
    if (!open) return
    if (machines.length > 0) return
    setLoadingM(true)
    fetch("/api/machines").then(r => r.json()).then(d => {
      setMachines(Array.isArray(d) ? d : d.machines ?? [])
    }).catch(() => {}).finally(() => setLoadingM(false))
  }, [open, machines.length])

  // Fetch list
  const fetchList = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoadingList(true)
    try {
      const res = await fetch("/api/service-requests/me", { headers: headers(token) })
      if (res.ok) {
        const data = await res.json()
        setRequests(Array.isArray(data) ? data : data.requests ?? [])
      }
    } catch { /* silent */ }
    setLoadingList(false)
  }, [])

  useEffect(() => {
    if (open) fetchList()
  }, [open, fetchList])

  // Fetch professions when machine changes
  const fetchProfessions = async (idMachine: string) => {
    setLoadingP(true)
    try {
      const res = await fetch(`/api/machines/${encodeURIComponent(idMachine)}/categories`)
      if (res.ok) {
        const d = await res.json()
        setProfessions(Array.isArray(d) ? d : d.categories ?? [])
      } else setProfessions([])
    } catch { setProfessions([]) }
    setLoadingP(false)
  }

  const fetchMunicipios = async (estadoId: string) => {
    setLoadingMun(true)
    try {
      const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estadoId}/municipios`)
      if (r.ok) {
        const d = await r.json()
        setMunicipios(d.map((m: { id: number; nome: string }) => ({ id: m.id, nome: m.nome })))
      }
    } catch { /* silent */ }
    setLoadingMun(false)
  }

  const handleMachineChange = (val: string) => {
    setForm(f => ({ ...f, id_machine: val, id_category: "" }))
    setProfessions([])
    if (val) fetchProfessions(val)
  }

  const handleEstadoChange = (uf: string) => {
    setForm(f => ({ ...f, estado: uf, municipio: "" }))
    const e = estados.find(e => e.uf === uf)
    if (e) fetchMunicipios(e.id.toString())
  }

  const handleCreate = async () => {
    if (!form.id_machine || !form.id_category || !form.description.trim()) {
      setCreateError("Preencha máquina, profissão e descrição.")
      return
    }
    const token = getToken()
    if (!token) return
    setCreating(true)
    setCreateError(null)
    try {
      const payload: Record<string, unknown> = {
        id_machine: Number(form.id_machine),
        id_category: Number(form.id_category),
        description: form.description.trim(),
      }
      if (isLocal && form.estado) payload.estado = form.estado
      if (isLocal && form.municipio) payload.municipio = form.municipio
      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm({ id_machine: "", id_category: "", estado: "", municipio: "", description: "" })
        setIsLocal(false)
        setTab("list")
        fetchList()
      } else {
        const d = await res.json().catch(() => ({}))
        setCreateError((d as { error?: string }).error || "Erro ao criar solicitação.")
      }
    } catch { setCreateError("Erro de rede.") }
    setCreating(false)
  }

  const handleCancel = async (idReq: string) => {
    if (!confirm("Cancelar esta solicitação?")) return
    const token = getToken()
    if (!token) return
    setActionLoading(idReq)
    try {
      await fetch(`/api/service-requests/${idReq}/cancel`, { method: "POST", headers: headers(token) })
      fetchList()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleFinalize = async (idReq: string, idResp: string) => {
    if (!confirm("Aceitar este profissional? A solicitação será encerrada para os demais.")) return
    const token = getToken()
    if (!token) return
    setActionLoading(idResp)
    try {
      await fetch(`/api/service-requests/${idReq}/finalize-response/${idResp}`, { method: "POST", headers: headers(token) })
      fetchList()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleReject = async (idReq: string, idResp: string) => {
    if (!confirm("Rejeitar este profissional?")) return
    const token = getToken()
    if (!token) return
    setActionLoading(idResp)
    try {
      await fetch(`/api/service-requests/${idReq}/reject-response/${idResp}`, { method: "POST", headers: headers(token) })
      fetchList()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const isTerminal = (s: string) => ["PRO_REJECTED", "USER_REJECTED", "FINALIZED", "CLOSED_OTHER_WON"].includes(s)

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            Pedir Serviço
          </DialogTitle>
          <DialogDescription>Crie solicitações e acompanhe respostas dos profissionais.</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b pb-0">
          <button
            onClick={() => setTab("list")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "list" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Minhas solicitações
          </button>
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === "new" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Nova solicitação
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {/* ========== TAB: NOVA SOLICITAÇÃO ========== */}
          {tab === "new" && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Máquina <span className="text-destructive">*</span></Label>
                <Select value={form.id_machine} onValueChange={handleMachineChange} disabled={loadingM}>
                  <SelectTrigger><SelectValue placeholder={loadingM ? "Carregando..." : "Selecione"} /></SelectTrigger>
                  <SelectContent>
                    {machines.map(m => <SelectItem key={m.id_machine} value={String(m.id_machine)}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Profissão <span className="text-destructive">*</span></Label>
                <Select value={form.id_category} onValueChange={v => setForm(f => ({ ...f, id_category: v }))} disabled={!form.id_machine || loadingP}>
                  <SelectTrigger><SelectValue placeholder={!form.id_machine ? "Selecione máquina primeiro" : loadingP ? "Carregando..." : "Selecione"} /></SelectTrigger>
                  <SelectContent>
                    {professions.map(p => <SelectItem key={p.id_category} value={String(p.id_category)}>{p.desc_category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="sr-local" checked={isLocal} onCheckedChange={v => setIsLocal(!!v)} />
                <Label htmlFor="sr-local" className="text-sm font-normal cursor-pointer">
                  É local? Quero filtrar por cidade <span className="text-muted-foreground">(opcional)</span>
                </Label>
              </div>

              {isLocal && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={form.estado} onValueChange={handleEstadoChange}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{estados.map(e => <SelectItem key={e.uf} value={e.uf}>{e.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Município</Label>
                    <Select value={form.municipio} onValueChange={v => setForm(f => ({ ...f, municipio: v }))} disabled={!form.estado || loadingMun}>
                      <SelectTrigger><SelectValue placeholder={loadingMun ? "Carregando..." : "Selecione"} /></SelectTrigger>
                      <SelectContent>{municipios.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Descreva o serviço que você precisa..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {createError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4" />{createError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setTab("list")} disabled={creating}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creating ? "Criando..." : "Criar solicitação"}
                </Button>
              </div>
            </div>
          )}

          {/* ========== TAB: LISTA ========== */}
          {tab === "list" && (
            <div className="space-y-3 py-2">
              {loadingList && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loadingList && requests.length === 0 && (
                <div className="text-center py-12">
                  <MessageSquarePlus className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-1">Nenhuma solicitação ainda</p>
                  <p className="text-sm text-muted-foreground mb-4">Crie uma para encontrar profissionais</p>
                  <Button size="sm" onClick={() => setTab("new")}>Nova solicitação</Button>
                </div>
              )}

              {!loadingList && requests.map(req => {
                const st = statusLabel[req.status] || { text: req.status, color: "bg-gray-500" }
                const isExp = expanded === req.id_request
                const responses = req.responses || []
                return (
                  <div key={req.id_request} className="border rounded-lg overflow-hidden">
                    {/* Header */}
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setExpanded(isExp ? null : req.id_request)}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{req.machine_name || "Máquina"}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-sm text-muted-foreground">{req.category_name || "Profissão"}</span>
                          <Badge className={`${st.color} text-white text-[10px] px-1.5 py-0`}>{st.text}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.description}</p>
                        {req.municipio && <p className="text-xs text-muted-foreground mt-0.5">📍 {req.municipio}{req.estado ? `, ${req.estado}` : ""}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {responses.length > 0 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            {responses.length} resposta{responses.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {isExp ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded: responses + actions */}
                    {isExp && (
                      <div className="border-t bg-muted/20">
                        <div className="p-3 text-xs text-muted-foreground flex items-center gap-3 border-b">
                          <span><Clock className="h-3 w-3 inline mr-1" />{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                          {req.status === "OPEN" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto text-destructive hover:text-destructive h-7 text-xs"
                              onClick={() => handleCancel(req.id_request)}
                              disabled={actionLoading === req.id_request}
                            >
                              {actionLoading === req.id_request ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Ban className="h-3 w-3 mr-1" />Cancelar O.S.</>}
                            </Button>
                          )}
                        </div>

                        {responses.length === 0 && (
                          <p className="p-4 text-sm text-muted-foreground text-center">Nenhum profissional respondeu ainda.</p>
                        )}

                        {responses.map(resp => {
                          const rl = respLabel[resp.status] || { text: resp.status, color: "bg-gray-500" }
                          const terminal = isTerminal(resp.status)
                          return (
                            <div key={resp.id_response} className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${terminal ? "opacity-60" : ""}`}>
                              <Avatar className="h-9 w-9 shrink-0">
                                {resp.avatar_url && <AvatarImage src={resp.avatar_url} alt={resp.display_name || ""} />}
                                <AvatarFallback className="text-xs">{initials(resp.display_name || "?")}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{resp.display_name || "Profissional"}</span>
                                  <Badge className={`${rl.color} text-white text-[10px] px-1.5 py-0`}>{rl.text}</Badge>
                                  {(resp.unread_count ?? 0) > 0 && (
                                    <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                      {resp.unread_count}
                                    </span>
                                  )}
                                </div>
                                {resp.last_message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{resp.last_message}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Conversar"
                                  onClick={() => {
                                    setChatIdResponse(resp.id_response)
                                    setChatIdRequest(req.id_request)
                                    setChatPeerName(resp.display_name || "Profissional")
                                    setChatPeerAvatar(resp.avatar_url)
                                    setChatRespStatus(resp.status)
                                    setChatOpen(true)
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                {!terminal && req.status === "OPEN" && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                      title="Aceitar profissional"
                                      onClick={() => handleFinalize(req.id_request, resp.id_response)}
                                      disabled={actionLoading === resp.id_response}
                                    >
                                      {actionLoading === resp.id_response ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                      title="Rejeitar"
                                      onClick={() => handleReject(req.id_request, resp.id_response)}
                                      disabled={actionLoading === resp.id_response}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Chat modal */}
    <ServiceChatModal
      open={chatOpen}
      onOpenChange={(v) => { setChatOpen(v); if (!v) fetchList() }}
      idResponse={chatIdResponse}
      peerName={chatPeerName}
      peerAvatar={chatPeerAvatar}
      viewerSide="USER"
      responseStatus={chatRespStatus}
      idRequest={chatIdRequest}
      onFinalize={fetchList}
    />
    </>
  )
}
