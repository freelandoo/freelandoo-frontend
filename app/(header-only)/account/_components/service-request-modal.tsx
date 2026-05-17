"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ESTADOS_BRASIL } from "@/lib/constants/estados-brasil"
import {
  MessageSquarePlus, Loader2, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, MessageCircle, Clock, Ban, AlertCircle,
  Sparkles, PackageSearch, MapPin, Upload, Package, Briefcase,
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

interface ProductCategory {
  id_product_category: number
  name: string
  slug: string
}

interface ProductRequest {
  id_product_request: string
  id_product_category: number
  category_name: string
  title: string
  description: string
  city: string
  state: string
  min_price_cents: number | null
  max_price_cents: number | null
  reference_image_url: string | null
  status: "open" | "answered" | "negotiating" | "closed" | "canceled" | "expired"
  created_at: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialMode?: "service" | "product"
}

type Mode = "service" | "product"
type SubTab = "list" | "new"

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */
function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}
function jsonHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}
function authHeaders(): HeadersInit {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}
function initials(name: string) {
  if (!name) return "?"
  const p = name.split(" ")
  return p[0][0] + (p[1]?.[0] || "")
}
function formatPrice(cents: number | null) {
  if (cents == null) return "—"
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}
function parsePriceReais(input: string): number | null {
  if (!input.trim()) return null
  const cleaned = input.replace(/\./g, "").replace(",", ".").trim()
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return -1
  return Math.round(n * 100)
}

const statusLabel: Record<string, { text: string; color: string }> = {
  OPEN: { text: "Aberta", color: "bg-emerald-500/20 text-emerald-300" },
  FULFILLED: { text: "Finalizada", color: "bg-sky-500/20 text-sky-300" },
  CANCELED: { text: "Cancelada", color: "bg-zinc-500/20 text-zinc-400" },
}
const respLabel: Record<string, { text: string; color: string }> = {
  PRO_ACCEPTED: { text: "Aguardando", color: "bg-amber-500/20 text-amber-300" },
  PRO_REJECTED: { text: "Pro rejeitou", color: "bg-red-500/20 text-red-300" },
  USER_REJECTED: { text: "Você rejeitou", color: "bg-zinc-500/20 text-zinc-400" },
  FINALIZED: { text: "Aceito ✓", color: "bg-emerald-500/20 text-emerald-300" },
  CLOSED_OTHER_WON: { text: "Encerrado", color: "bg-zinc-500/20 text-zinc-400" },
}
const PRODUCT_STATUS_LABEL: Record<ProductRequest["status"], { text: string; color: string }> = {
  open:        { text: "Aberto",       color: "bg-emerald-500/20 text-emerald-300" },
  answered:    { text: "Respondido",   color: "bg-sky-500/20 text-sky-300" },
  negotiating: { text: "Negociando",   color: "bg-amber-500/20 text-amber-300" },
  closed:      { text: "Concluído",    color: "bg-zinc-500/20 text-zinc-300" },
  canceled:    { text: "Cancelado",    color: "bg-zinc-600/20 text-zinc-400" },
  expired:     { text: "Expirado",     color: "bg-zinc-600/20 text-zinc-400" },
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export function ServiceRequestModal({ open, onOpenChange, initialMode = "service" }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [tab, setTab] = useState<SubTab>("list")

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0 border-white/10 bg-gradient-to-b from-neutral-950 to-black">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400/25 to-amber-500/15 text-yellow-300">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base text-white">
                {mode === "service" ? "Pedir Serviço" : "Pedir Produto"}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/50">
                {mode === "service"
                  ? "Crie solicitações e acompanhe respostas dos profissionais."
                  : "Diga o que procura — vendedores compatíveis verão no mural."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="px-6 pt-4">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <ModeButton
              active={mode === "service"}
              onClick={() => { setMode("service"); setTab("list") }}
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Serviço"
            />
            <ModeButton
              active={mode === "product"}
              onClick={() => { setMode("product"); setTab("list") }}
              icon={<Package className="h-3.5 w-3.5" />}
              label="Produto"
            />
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="px-6 pt-3">
          <div className="flex gap-4 border-b border-white/[0.06]">
            <SubTabButton active={tab === "list"} onClick={() => setTab("list")}>
              {mode === "service" ? "Minhas solicitações" : "Meus pedidos"}
            </SubTabButton>
            <SubTabButton active={tab === "new"} onClick={() => setTab("new")}>
              {mode === "service" ? "Nova solicitação" : "Novo pedido"}
            </SubTabButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${mode}-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            >
              {mode === "service" && tab === "list" && (
                <ServiceList onNew={() => setTab("new")} onCloseModal={() => onOpenChange(false)} />
              )}
              {mode === "service" && tab === "new" && (
                <ServiceCreateForm onCreated={() => setTab("list")} />
              )}
              {mode === "product" && tab === "list" && (
                <ProductList onNew={() => setTab("new")} />
              )}
              {mode === "product" && tab === "new" && (
                <ProductCreateForm onCreated={() => setTab("list")} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/*  Shared UI atoms                                                   */
/* ------------------------------------------------------------------ */
function ModeButton({ active, onClick, icon, label }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gradient-to-r from-yellow-400/20 to-amber-500/10 text-yellow-200"
          : "text-white/55 hover:text-white/85"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SubTabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-1 py-2 text-sm font-medium transition-colors ${
        active ? "text-yellow-300" : "text-white/55 hover:text-white/85"
      }`}
    >
      {children}
      {active && (
        <motion.span
          layoutId="sub-tab-underline"
          className="absolute -bottom-px left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 to-amber-500"
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
        />
      )}
    </button>
  )
}

function EmptyState({ icon, title, hint, action }: {
  icon: React.ReactNode; title: string; hint: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/40 ring-1 ring-white/10"
      >
        {icon}
      </motion.div>
      <p className="text-sm font-medium text-white/80">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-white/40">{hint}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/50">
      {children} {required && <span className="text-red-400 normal-case">*</span>}
    </label>
  )
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-yellow-400/40 focus:outline-none focus:ring-0"

/* ------------------------------------------------------------------ */
/*  SERVICE — Create                                                  */
/* ------------------------------------------------------------------ */
function ServiceCreateForm({ onCreated }: { onCreated: () => void }) {
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

  const estados = ESTADOS_BRASIL

  useEffect(() => {
    if (machines.length > 0) return
    setLoadingM(true)
    fetch("/api/machines").then(r => r.json()).then(d => {
      setMachines(Array.isArray(d) ? d : d.machines ?? [])
    }).catch(() => {}).finally(() => setLoadingM(false))
  }, [machines.length])

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
        headers: jsonHeaders(token),
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        setForm({ id_machine: "", id_category: "", estado: "", municipio: "", description: "" })
        setIsLocal(false)
        onCreated()
      } else {
        const d = await res.json().catch(() => ({}))
        setCreateError((d as { error?: string }).error || "Erro ao criar solicitação.")
      }
    } catch { setCreateError("Erro de rede.") }
    setCreating(false)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Máquina</FieldLabel>
          <Select value={form.id_machine} onValueChange={handleMachineChange} disabled={loadingM}>
            <SelectTrigger className={inputCls}>
              <SelectValue placeholder={loadingM ? "Carregando..." : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {machines.map(m => <SelectItem key={m.id_machine} value={String(m.id_machine)}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel required>Profissão</FieldLabel>
          <Select value={form.id_category} onValueChange={v => setForm(f => ({ ...f, id_category: v }))} disabled={!form.id_machine || loadingP}>
            <SelectTrigger className={inputCls}>
              <SelectValue placeholder={!form.id_machine ? "Escolha a máquina" : loadingP ? "Carregando..." : "Selecione"} />
            </SelectTrigger>
            <SelectContent>
              {professions.map(p => <SelectItem key={p.id_category} value={String(p.id_category)}>{p.desc_category}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
        <Checkbox id="sr-local" checked={isLocal} onCheckedChange={v => setIsLocal(!!v)} />
        <label htmlFor="sr-local" className="text-xs text-white/75 cursor-pointer flex items-center gap-1.5">
          <MapPin className="h-3 w-3" />
          É local — filtrar por cidade <span className="text-white/40">(opcional)</span>
        </label>
      </div>

      <AnimatePresence>
        {isLocal && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 26 }}
            className="grid grid-cols-2 gap-3 overflow-hidden"
          >
            <div>
              <FieldLabel>Estado</FieldLabel>
              <Select value={form.estado} onValueChange={handleEstadoChange}>
                <SelectTrigger className={inputCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{estados.map(e => <SelectItem key={e.uf} value={e.uf}>{e.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Município</FieldLabel>
              <Select value={form.municipio} onValueChange={v => setForm(f => ({ ...f, municipio: v }))} disabled={!form.estado || loadingMun}>
                <SelectTrigger className={inputCls}><SelectValue placeholder={loadingMun ? "Carregando..." : "Selecione"} /></SelectTrigger>
                <SelectContent>{municipios.map(m => <SelectItem key={m.id} value={m.nome}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <FieldLabel required>Descrição</FieldLabel>
        <Textarea
          placeholder="Conte o que precisa: contexto, prazo, expectativa..."
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={4}
          maxLength={2000}
          className="rounded-xl border-white/10 bg-white/[0.03] text-sm text-white placeholder:text-white/30 resize-none focus-visible:ring-yellow-400/40"
        />
        <div className="mt-1 text-right text-[10px] tabular-nums text-white/30">{form.description.length}/2000</div>
      </div>

      {createError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-200"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {createError}
        </motion.div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          onClick={handleCreate}
          disabled={creating}
          className="h-10 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 font-medium text-black hover:from-yellow-300 hover:to-amber-400 shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)]"
        >
          {creating ? (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Criando…</>) : (<><Sparkles className="mr-1.5 h-4 w-4" />Publicar</>)}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SERVICE — List                                                    */
/* ------------------------------------------------------------------ */
function ServiceList({ onNew, onCloseModal }: { onNew: () => void; onCloseModal: () => void }) {
  const router = useRouter()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoadingList(true)
    try {
      const res = await fetch("/api/service-requests/me", { headers: jsonHeaders(token) })
      if (res.ok) {
        const data = await res.json()
        setRequests(Array.isArray(data) ? data : data.requests ?? [])
      }
    } catch { /* silent */ }
    setLoadingList(false)
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const handleCancel = async (idReq: string) => {
    if (!confirm("Cancelar esta solicitação?")) return
    const token = getToken()
    if (!token) return
    setActionLoading(idReq)
    try {
      await fetch(`/api/service-requests/${idReq}/cancel`, { method: "POST", headers: jsonHeaders(token) })
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
      await fetch(`/api/service-requests/${idReq}/finalize-response/${idResp}`, { method: "POST", headers: jsonHeaders(token) })
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
      await fetch(`/api/service-requests/${idReq}/reject-response/${idResp}`, { method: "POST", headers: jsonHeaders(token) })
      fetchList()
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const isTerminal = (s: string) => ["PRO_REJECTED", "USER_REJECTED", "FINALIZED", "CLOSED_OTHER_WON"].includes(s)

  const openResponseChat = (idResponse: string) => {
    onCloseModal()
    router.push(`/mensagens?tab=os&response=${encodeURIComponent(idResponse)}`)
  }

  if (loadingList) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-yellow-300/70" /></div>
  }
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<MessageSquarePlus className="h-8 w-8" />}
        title="Nenhuma solicitação ainda"
        hint="Crie uma para encontrar profissionais compatíveis na sua região."
        action={<Button size="sm" onClick={onNew} className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Nova solicitação</Button>}
      />
    )
  }

  return (
    <div className="space-y-2.5">
      {requests.map(req => {
        const st = statusLabel[req.status] || { text: req.status, color: "bg-zinc-500/20 text-zinc-300" }
        const isExp = expanded === req.id_request
        const responses = req.responses || []
        return (
          <div key={req.id_request} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-3 p-3.5 text-left transition-colors hover:bg-white/[0.03]"
              onClick={() => setExpanded(isExp ? null : req.id_request)}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white">{req.machine_name || "Máquina"}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-sm text-white/65">{req.category_name || "Profissão"}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${st.color}`}>{st.text}</span>
                </div>
                <p className="mt-1 text-xs text-white/50 line-clamp-1">{req.description}</p>
                {req.municipio && (
                  <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-white/40">
                    <MapPin className="h-2.5 w-2.5" />
                    {req.municipio}{req.estado ? `, ${req.estado}` : ""}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {responses.length > 0 && (
                  <span className="rounded-full bg-yellow-400/15 px-2 py-0.5 text-[10px] font-medium text-yellow-200 tabular-nums">
                    {responses.length} resposta{responses.length > 1 ? "s" : ""}
                  </span>
                )}
                {isExp ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isExp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 28 }}
                  className="overflow-hidden border-t border-white/[0.06] bg-black/30"
                >
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-3.5 py-2 text-[11px] text-white/45">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(req.created_at).toLocaleDateString("pt-BR")}</span>
                    {req.status === "OPEN" && (
                      <button
                        className="ml-auto inline-flex items-center gap-1 text-red-300 hover:text-red-200"
                        onClick={() => handleCancel(req.id_request)}
                        disabled={actionLoading === req.id_request}
                      >
                        {actionLoading === req.id_request ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Ban className="h-3 w-3" />Cancelar</>}
                      </button>
                    )}
                  </div>
                  {responses.length === 0 ? (
                    <p className="px-3.5 py-5 text-center text-xs text-white/45">Nenhum profissional respondeu ainda.</p>
                  ) : (
                    responses.map(resp => {
                      const rl = respLabel[resp.status] || { text: resp.status, color: "bg-zinc-500/20 text-zinc-300" }
                      const terminal = isTerminal(resp.status)
                      return (
                        <div key={resp.id_response} className={`flex items-center gap-3 border-b border-white/[0.04] px-3.5 py-2.5 last:border-b-0 ${terminal ? "opacity-50" : ""}`}>
                          <Avatar className="h-9 w-9 shrink-0 ring-1 ring-white/10">
                            {resp.avatar_url && <AvatarImage src={resp.avatar_url} alt={resp.display_name || ""} />}
                            <AvatarFallback className="text-xs bg-white/[0.06] text-white/70">{initials(resp.display_name || "?")}</AvatarFallback>
                          </Avatar>
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => openResponseChat(resp.id_response)}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">{resp.display_name || "Profissional"}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${rl.color}`}>{rl.text}</span>
                              {(resp.unread_count ?? 0) > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                  {resp.unread_count}
                                </span>
                              )}
                            </div>
                            {resp.last_message && <p className="mt-0.5 text-xs text-white/45 line-clamp-1">{resp.last_message}</p>}
                          </button>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/55 hover:bg-white/[0.04] hover:text-white" title="Conversar" onClick={() => openResponseChat(resp.id_response)}>
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            {!terminal && req.status === "OPEN" && (
                              <>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300" title="Aceitar" onClick={() => handleFinalize(req.id_request, resp.id_response)} disabled={actionLoading === resp.id_response}>
                                  {actionLoading === resp.id_response ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300" title="Rejeitar" onClick={() => handleReject(req.id_request, resp.id_response)} disabled={actionLoading === resp.id_response}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PRODUCT — Create                                                  */
/* ------------------------------------------------------------------ */
function ProductCreateForm({ onCreated }: { onCreated: () => void }) {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [form, setForm] = useState({
    title: "", description: "", id_product_category: "",
    state: "", city: "", min_price_reais: "", max_price_reais: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/product-categories")
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d?.categories) ? d.categories : []))
      .catch(() => {})
  }, [])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    if (e.target) e.target.value = ""
    if (!f) return
    if (!f.type.startsWith("image/")) { setError("Imagem deve ser JPG/PNG/WebP"); return }
    if (f.size > 10 * 1024 * 1024) { setError("Imagem até 10MB"); return }
    setError(null)
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null); setPreview(null)
  }

  async function submit() {
    setError(null)
    const title = form.title.trim()
    const description = form.description.trim()
    const city = form.city.trim()
    const state = form.state.trim().toUpperCase()
    const catId = Number(form.id_product_category)

    if (title.length < 3) { setError("Título obrigatório (mín. 3 caracteres)"); return }
    if (description.length < 5) { setError("Descrição obrigatória (mín. 5 caracteres)"); return }
    if (!catId) { setError("Selecione uma categoria"); return }
    if (state.length !== 2) { setError("Estado obrigatório (UF)"); return }
    if (!city) { setError("Cidade obrigatória"); return }

    const minPrice = parsePriceReais(form.min_price_reais)
    const maxPrice = parsePriceReais(form.max_price_reais)
    if (minPrice === -1) { setError("Preço mínimo inválido"); return }
    if (maxPrice === -1) { setError("Preço máximo inválido"); return }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("title", title)
      fd.append("description", description)
      fd.append("id_product_category", String(catId))
      fd.append("city", city)
      fd.append("state", state)
      if (minPrice != null) fd.append("min_price_cents", String(minPrice))
      if (maxPrice != null) fd.append("max_price_cents", String(maxPrice))
      if (file) fd.append("reference_image", file)

      const r = await fetch("/api/product-requests", {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      })
      const d = await r.json()
      if (!r.ok) { setError(d?.error || "Erro ao criar pedido"); return }
      setForm({ title: "", description: "", id_product_category: "", state: "", city: "", min_price_reais: "", max_price_reais: "" })
      clearFile()
      onCreated()
    } catch {
      setError("Erro de conexão")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel required>Título</FieldLabel>
        <input
          type="text"
          value={form.title}
          maxLength={160}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Tênis de corrida masculino tam 42..."
          className={inputCls}
        />
      </div>

      <div>
        <FieldLabel required>Categoria</FieldLabel>
        <select
          value={form.id_product_category}
          onChange={(e) => setForm((f) => ({ ...f, id_product_category: e.target.value }))}
          className={inputCls}
        >
          <option value="">Selecione uma categoria…</option>
          {categories.map((c) => (
            <option key={c.id_product_category} value={c.id_product_category}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
        <div>
          <FieldLabel required>UF</FieldLabel>
          <select
            value={form.state}
            onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
            className={inputCls}
          >
            <option value="">UF</option>
            {ESTADOS_BRASIL.map((e) => <option key={e.uf} value={e.uf}>{e.uf}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel required>Cidade</FieldLabel>
          <input
            type="text"
            value={form.city}
            maxLength={120}
            onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            placeholder="Ex: Santo André"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <FieldLabel required>Descrição</FieldLabel>
        <textarea
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={4}
          maxLength={4000}
          placeholder="Marca/modelo, condição, cor, tamanho..."
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Preço mínimo (R$)</FieldLabel>
          <input
            type="text"
            value={form.min_price_reais}
            onChange={(e) => setForm((f) => ({ ...f, min_price_reais: e.target.value }))}
            placeholder="0,00"
            className={`${inputCls} font-mono`}
          />
        </div>
        <div>
          <FieldLabel>Preço máximo (R$)</FieldLabel>
          <input
            type="text"
            value={form.max_price_reais}
            onChange={(e) => setForm((f) => ({ ...f, max_price_reais: e.target.value }))}
            placeholder="0,00"
            className={`${inputCls} font-mono`}
          />
        </div>
      </div>

      <div>
        <FieldLabel>Imagem de referência (opcional)</FieldLabel>
        {preview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-32 w-32 rounded-xl object-cover ring-1 ring-white/10" />
            <button
              type="button"
              onClick={clearFile}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white"
              aria-label="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2 text-xs text-white/55 hover:border-yellow-400/40 hover:text-white/85 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            Escolher imagem (JPG/PNG/WebP, até 10MB)
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFile} />
          </label>
        )}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/[0.08] px-3 py-2 text-xs text-red-200"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </motion.div>
      )}

      <div className="flex justify-end pt-1">
        <Button
          onClick={submit}
          disabled={submitting}
          className="h-10 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 font-medium text-black hover:from-yellow-300 hover:to-amber-400 shadow-[0_8px_24px_-8px_rgba(250,204,21,0.5)]"
        >
          {submitting ? (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Publicando…</>) : (<><Sparkles className="mr-1.5 h-4 w-4" />Publicar pedido</>)}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  PRODUCT — List                                                    */
/* ------------------------------------------------------------------ */
function ProductList({ onNew }: { onNew: () => void }) {
  const [list, setList] = useState<ProductRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/product-requests/me", { headers: authHeaders() })
      const d = await r.json()
      if (r.ok) setList(Array.isArray(d?.requests) ? d.requests : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function cancel(id: string) {
    if (!confirm("Cancelar este pedido?")) return
    setCancelingId(id)
    try {
      await fetch(`/api/product-requests/${id}/cancel`, { method: "POST", headers: authHeaders() })
      await load()
    } finally { setCancelingId(null) }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-yellow-300/70" /></div>
  }
  if (list.length === 0) {
    return (
      <EmptyState
        icon={<PackageSearch className="h-8 w-8" />}
        title="Você ainda não publicou pedidos"
        hint="Diga o que procura e vendedores compatíveis verão no mural deles."
        action={<Button size="sm" onClick={onNew} className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400"><Sparkles className="mr-1.5 h-3.5 w-3.5" />Criar primeiro pedido</Button>}
      />
    )
  }

  return (
    <div className="space-y-2.5">
      {list.map((r) => {
        const st = PRODUCT_STATUS_LABEL[r.status]
        const canCancel = ["open", "answered", "negotiating"].includes(r.status)
        const priceRange =
          r.min_price_cents != null || r.max_price_cents != null
            ? `${formatPrice(r.min_price_cents)} — ${formatPrice(r.max_price_cents)}`
            : null
        return (
          <div key={r.id_product_request} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <div className="flex items-start gap-3 p-3.5">
              {r.reference_image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={r.reference_image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/10">
                  <Package className="h-5 w-5 text-white/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-white">{r.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${st.color}`}>{st.text}</span>
                </div>
                <p className="mt-1 text-xs text-white/50">
                  <span className="font-medium text-white/75">{r.category_name}</span> · {r.city}/{r.state}
                  {priceRange && <> · <span className="tabular-nums text-white/70">{priceRange}</span></>}
                </p>
                <p className="mt-1.5 text-xs text-white/55 line-clamp-2">{r.description}</p>
                <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/35">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              {canCancel && (
                <button
                  onClick={() => cancel(r.id_product_request)}
                  disabled={cancelingId === r.id_product_request}
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-2 py-1 text-[11px] text-white/55 hover:border-red-400/30 hover:text-red-300 disabled:opacity-50"
                >
                  {cancelingId === r.id_product_request ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
