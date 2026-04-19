"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Users,
  Loader2,
  Settings2,
  ListOrdered,
  CheckCircle2,
  XCircle,
  Pause,
  Ban,
  Plus,
  Wallet,
  Eye,
  BarChart3,
  History,
  AlertTriangle,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type Section = "overview" | "affiliates" | "settings" | "conversions" | "payouts" | "audit"

interface Affiliate {
  id_affiliate: string
  id_user: string
  status: "ACTIVE" | "PAUSED" | "BLOCKED"
  pix_key?: string | null
  pix_key_type?: string | null
  legal_name?: string | null
  tax_id?: string | null
  created_at?: string
  user_nome?: string
  user_email?: string
  total_pending_cents?: number
  total_approved_cents?: number
  total_paid_cents?: number
}

interface SettingsRow {
  id_settings: string
  effective_from: string
  default_commission_percent: number
  commission_base: "GROSS" | "NET_OF_DISCOUNT"
  min_order_cents: number
  max_commission_cents: number | null
  approval_delay_days: number
  created_by?: string
  notes?: string | null
}

interface Conversion {
  id_conversion: string
  id_affiliate: string
  id_order: string
  id_coupon: string
  coupon_code?: string
  order_total_cents: number
  discount_cents: number
  commission_cents: number
  status: "PENDING" | "APPROVED" | "PAID" | "REVERSED"
  disputed?: boolean
  created_at: string
  eligible_at?: string | null
  affiliate_user_nome?: string
}

function formatBRL(cents: number | null | undefined) {
  const v = ((cents ?? 0) as number) / 100
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso?: string | null) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("pt-BR")
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-500/20 text-green-300",
  PAUSED: "bg-yellow-500/20 text-yellow-300",
  BLOCKED: "bg-red-500/20 text-red-300",
  PENDING: "bg-yellow-500/20 text-yellow-300",
  APPROVED: "bg-blue-500/20 text-blue-300",
  PAID: "bg-green-500/20 text-green-300",
  REVERSED: "bg-red-500/20 text-red-300",
  DRAFT: "bg-zinc-500/20 text-zinc-300",
  SENT: "bg-blue-500/20 text-blue-300",
  CANCELED: "bg-red-500/20 text-red-300",
  FAILED: "bg-red-500/20 text-red-300",
}

export default function AdminAfiliadosPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [section, setSection] = useState<Section>("overview")

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdminFlag =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdminFlag) {
          router.push("/")
          return
        }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Afiliados</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie afiliados, regras e conversões
            </p>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={section === "overview" ? "default" : "outline"}
            onClick={() => setSection("overview")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" /> Visão geral
          </Button>
          <Button
            variant={section === "affiliates" ? "default" : "outline"}
            onClick={() => setSection("affiliates")}
            className="gap-2"
          >
            <Users className="h-4 w-4" /> Afiliados
          </Button>
          <Button
            variant={section === "settings" ? "default" : "outline"}
            onClick={() => setSection("settings")}
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" /> Regras
          </Button>
          <Button
            variant={section === "conversions" ? "default" : "outline"}
            onClick={() => setSection("conversions")}
            className="gap-2"
          >
            <ListOrdered className="h-4 w-4" /> Conversões
          </Button>
          <Button
            variant={section === "payouts" ? "default" : "outline"}
            onClick={() => setSection("payouts")}
            className="gap-2"
          >
            <Wallet className="h-4 w-4" /> Pagamentos
          </Button>
          <Button
            variant={section === "audit" ? "default" : "outline"}
            onClick={() => setSection("audit")}
            className="gap-2"
          >
            <History className="h-4 w-4" /> Auditoria
          </Button>
        </div>

        {section === "overview" && <OverviewSection />}
        {section === "affiliates" && <AffiliatesSection />}
        {section === "settings" && <SettingsSection />}
        {section === "conversions" && <ConversionsSection />}
        {section === "payouts" && <PayoutsSection />}
        {section === "audit" && <AuditSection />}
      </main>
    </div>
  )
}

// ─────────────────────────── Affiliates ───────────────────────────
function AffiliatesSection() {
  const [rows, setRows] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [q, setQ] = useState("")
  const [statusDialog, setStatusDialog] = useState<Affiliate | null>(null)
  const [newStatus, setNewStatus] = useState<"ACTIVE" | "PAUSED" | "BLOCKED">("ACTIVE")
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (q) params.set("q", q)
      const res = await fetch(`/api/admin/affiliate?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : data.items || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, q])

  useEffect(() => {
    load()
  }, [load])

  async function submitStatus() {
    if (!statusDialog) return
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`/api/admin/affiliate/${statusDialog.id_affiliate}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus, reason }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Erro ao atualizar status")
        return
      }
      setStatusDialog(null)
      setReason("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label>Buscar</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome ou email"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="PAUSED">Pausado</SelectItem>
              <SelectItem value="BLOCKED">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={load}>Aplicar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Nenhum afiliado</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Afiliado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Pendente</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Aprovado</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Pago</th>
                  <th className="px-4 py-3 text-center text-xs uppercase text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((a) => (
                  <tr key={a.id_affiliate}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{a.user_nome || a.id_user}</div>
                      <div className="text-xs text-muted-foreground">{a.user_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[a.status]}>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{formatBRL(a.total_pending_cents)}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(a.total_approved_cents)}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(a.total_paid_cents)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStatusDialog(a)
                            setNewStatus(a.status)
                          }}
                        >
                          Status
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!statusDialog} onOpenChange={(o) => !o && setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Novo status</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as typeof newStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" />Ativo</span>
                  </SelectItem>
                  <SelectItem value="PAUSED">
                    <span className="flex items-center gap-2"><Pause className="h-4 w-4 text-yellow-500" />Pausado</span>
                  </SelectItem>
                  <SelectItem value="BLOCKED">
                    <span className="flex items-center gap-2"><Ban className="h-4 w-4 text-red-500" />Bloqueado</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo (opcional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(null)}>Cancelar</Button>
            <Button onClick={submitStatus} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────── Settings ───────────────────────────
function SettingsSection() {
  const [rows, setRows] = useState<SettingsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    default_commission_percent: "10",
    commission_base: "GROSS" as "GROSS" | "NET_OF_DISCOUNT",
    min_order_cents: "0",
    max_commission_cents: "",
    approval_delay_days: "7",
    effective_from: "",
    notes: "",
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/affiliate/settings", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : data.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function submit() {
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const body: Record<string, unknown> = {
        default_commission_percent: Number(form.default_commission_percent),
        commission_base: form.commission_base,
        min_order_cents: Number(form.min_order_cents) || 0,
        approval_delay_days: Number(form.approval_delay_days) || 0,
      }
      if (form.max_commission_cents) body.max_commission_cents = Number(form.max_commission_cents)
      if (form.effective_from) body.effective_from = form.effective_from
      if (form.notes) body.notes = form.notes

      const res = await fetch("/api/admin/affiliate/settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Erro ao criar regra")
        return
      }
      setCreating(false)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova regra
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Settings2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Nenhuma regra cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Vigência</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">%</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Base</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Mín. pedido</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Máx. comissão</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Delay (d)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s) => (
                  <tr key={s.id_settings}>
                    <td className="px-4 py-3">{formatDate(s.effective_from)}</td>
                    <td className="px-4 py-3 text-right">{Number(s.default_commission_percent).toFixed(2)}%</td>
                    <td className="px-4 py-3">{s.commission_base}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(s.min_order_cents)}</td>
                    <td className="px-4 py-3 text-right">{s.max_commission_cents ? formatBRL(s.max_commission_cents) : "-"}</td>
                    <td className="px-4 py-3 text-right">{s.approval_delay_days}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova regra de afiliação</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.default_commission_percent}
                onChange={(e) => setForm({ ...form, default_commission_percent: e.target.value })}
              />
            </div>
            <div>
              <Label>Base</Label>
              <Select
                value={form.commission_base}
                onValueChange={(v) => setForm({ ...form, commission_base: v as typeof form.commission_base })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GROSS">Bruto</SelectItem>
                  <SelectItem value="NET_OF_DISCOUNT">Líquido do desconto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mín. pedido (centavos)</Label>
              <Input
                type="number"
                value={form.min_order_cents}
                onChange={(e) => setForm({ ...form, min_order_cents: e.target.value })}
              />
            </div>
            <div>
              <Label>Máx. comissão (centavos)</Label>
              <Input
                type="number"
                value={form.max_commission_cents}
                onChange={(e) => setForm({ ...form, max_commission_cents: e.target.value })}
              />
            </div>
            <div>
              <Label>Delay aprovação (dias)</Label>
              <Input
                type="number"
                value={form.approval_delay_days}
                onChange={(e) => setForm({ ...form, approval_delay_days: e.target.value })}
              />
            </div>
            <div>
              <Label>Vigência a partir de</Label>
              <Input
                type="datetime-local"
                value={form.effective_from}
                onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <Label>Notas</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────── Payouts ───────────────────────────
interface Batch {
  id_batch: string
  id_affiliate: string
  period_start: string | null
  period_end: string
  total_cents: number
  status: "DRAFT" | "SENT" | "PAID" | "CANCELED" | "FAILED"
  pix_key_snapshot: string | null
  receipt_url: string | null
  notes: string | null
  paid_at: string | null
  created_at: string
  affiliate_user_nome?: string
  affiliate_user_email?: string
  items?: BatchItem[]
}

interface BatchItem {
  id_item: string
  id_conversion: string
  commission_cents: number
  id_order: string
  coupon_code: string | null
}

interface EligibleItem {
  id_conversion: string
  commission_cents: number
  eligible_at: string
  id_order: string
}

function PayoutsSection() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null)
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/affiliate/payouts?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setBatches(Array.isArray(data) ? data : data.items || [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/admin/affiliate?status=ACTIVE", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setAffiliates(Array.isArray(d) ? d : d.items || []))
      .catch(() => {})
  }, [])

  async function openDetail(id: string) {
    const token = localStorage.getItem("token")
    const res = await fetch(`/api/admin/affiliate/payouts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setDetailBatch(await res.json())
  }

  async function changeStatus(id: string, status: string) {
    if (!confirm(`Confirmar mudança para ${status}?`)) return
    const token = localStorage.getItem("token")
    const res = await fetch(`/api/admin/affiliate/payouts/${id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || "Erro")
      return
    }
    setDetailBatch(null)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="DRAFT">Rascunho</SelectItem>
              <SelectItem value="SENT">Enviado</SelectItem>
              <SelectItem value="PAID">Pago</SelectItem>
              <SelectItem value="CANCELED">Cancelado</SelectItem>
              <SelectItem value="FAILED">Falhou</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo lote
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : batches.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Nenhum lote</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Criado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Afiliado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Período</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs uppercase text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batches.map((b) => (
                  <tr key={b.id_batch}>
                    <td className="px-4 py-3">{formatDate(b.created_at)}</td>
                    <td className="px-4 py-3">
                      <div>{b.affiliate_user_nome || b.id_affiliate.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{b.affiliate_user_email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {b.period_start ? `${formatDate(b.period_start)} → ` : ""}
                      {formatDate(b.period_end)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatBRL(b.total_cents)}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[b.status] || "bg-muted"}>{b.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="outline" onClick={() => openDetail(b.id_batch)} className="gap-1">
                        <Eye className="h-3 w-3" /> Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateBatchDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        affiliates={affiliates}
        onCreated={load}
      />

      <BatchDetailDialog
        batch={detailBatch}
        onClose={() => setDetailBatch(null)}
        onChangeStatus={changeStatus}
      />
    </div>
  )
}

function CreateBatchDialog({
  open,
  onOpenChange,
  affiliates,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  affiliates: Affiliate[]
  onCreated: () => void
}) {
  const [idAffiliate, setIdAffiliate] = useState("")
  const [eligible, setEligible] = useState<EligibleItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState("")
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setIdAffiliate("")
      setEligible([])
      setSelected(new Set())
      setNotes("")
    }
  }, [open])

  useEffect(() => {
    if (!idAffiliate) return
    setLoadingEligible(true)
    const token = localStorage.getItem("token")
    fetch(`/api/admin/affiliate/payouts/eligible?id_affiliate=${idAffiliate}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const items: EligibleItem[] = d.items || []
        setEligible(items)
        setSelected(new Set(items.map((i) => i.id_conversion)))
      })
      .finally(() => setLoadingEligible(false))
  }, [idAffiliate])

  const total = eligible
    .filter((i) => selected.has(i.id_conversion))
    .reduce((s, i) => s + i.commission_cents, 0)

  async function submit() {
    if (!idAffiliate || selected.size === 0) {
      alert("Selecione afiliado e ao menos uma conversão")
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("/api/admin/affiliate/payouts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          id_affiliate: idAffiliate,
          period_end: periodEnd,
          conversion_ids: Array.from(selected),
          notes: notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || "Erro ao criar lote")
        return
      }
      onCreated()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo lote de pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Afiliado</Label>
              <Select value={idAffiliate} onValueChange={setIdAffiliate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {affiliates.map((a) => (
                    <SelectItem key={a.id_affiliate} value={a.id_affiliate}>
                      {a.user_nome || a.id_user.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Período (fim)</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>

          {idAffiliate && (
            <div>
              <Label>Conversões elegíveis</Label>
              {loadingEligible ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : eligible.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Nenhuma conversão elegível</p>
              ) : (
                <div className="max-h-60 overflow-y-auto rounded-md border border-border">
                  {eligible.map((i) => (
                    <label
                      key={i.id_conversion}
                      className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(i.id_conversion)}
                        onChange={() => toggle(i.id_conversion)}
                      />
                      <div className="flex-1 font-mono text-xs text-muted-foreground">
                        {i.id_order.slice(0, 8)}
                      </div>
                      <div className="text-xs">{formatDate(i.eligible_at)}</div>
                      <div className="w-24 text-right font-medium">{formatBRL(i.commission_cents)}</div>
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">{selected.size} selecionada(s)</span>
                <span className="font-medium">Total: {formatBRL(total)}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving || selected.size === 0}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BatchDetailDialog({
  batch,
  onClose,
  onChangeStatus,
}: {
  batch: Batch | null
  onClose: () => void
  onChangeStatus: (id: string, status: string) => void
}) {
  if (!batch) return null
  const isDraft = batch.status === "DRAFT"
  const isSent = batch.status === "SENT"

  return (
    <Dialog open={!!batch} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Lote {batch.id_batch.slice(0, 8)}
            <Badge className={`ml-2 ${STATUS_BADGE[batch.status]}`}>{batch.status}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="font-medium">{formatBRL(batch.total_cents)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">PIX:</span>{" "}
              <span className="font-mono text-xs">{batch.pix_key_snapshot || "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Criado:</span> {formatDate(batch.created_at)}
            </div>
            <div>
              <span className="text-muted-foreground">Pago em:</span> {formatDate(batch.paid_at)}
            </div>
          </div>

          <div>
            <Label>Itens</Label>
            <div className="max-h-60 overflow-y-auto rounded-md border border-border">
              {(batch.items || []).map((i) => (
                <div
                  key={i.id_item}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0"
                >
                  <div className="flex-1 font-mono text-xs text-muted-foreground">
                    {i.id_order.slice(0, 8)}
                  </div>
                  <div className="text-xs">{i.coupon_code || "-"}</div>
                  <div className="w-24 text-right font-medium">{formatBRL(i.commission_cents)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          {isDraft && (
            <>
              <Button variant="outline" onClick={() => onChangeStatus(batch.id_batch, "SENT")}>
                Marcar como enviado
              </Button>
              <Button variant="outline" onClick={() => onChangeStatus(batch.id_batch, "CANCELED")}>
                Cancelar
              </Button>
            </>
          )}
          {(isDraft || isSent) && (
            <>
              <Button onClick={() => onChangeStatus(batch.id_batch, "PAID")}>
                Confirmar pagamento
              </Button>
              <Button variant="outline" onClick={() => onChangeStatus(batch.id_batch, "FAILED")}>
                Falhou
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────── Conversions ───────────────────────────
function ConversionsSection() {
  const [rows, setRows] = useState<Conversion[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [code, setCode] = useState("")
  const [disputeTarget, setDisputeTarget] = useState<Conversion | null>(null)
  const [disputeAction, setDisputeAction] = useState<"keep" | "reverse">("keep")
  const [disputeReason, setDisputeReason] = useState("")
  const [resolving, setResolving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams()
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (code) params.set("code", code)
      const res = await fetch(`/api/admin/affiliate/conversions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRows(Array.isArray(data) ? data : data.items || [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, code])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="APPROVED">Aprovada</SelectItem>
              <SelectItem value="PAID">Paga</SelectItem>
              <SelectItem value="REVERSED">Revertida</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Cupom</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código" />
        </div>
        <Button onClick={load}>Aplicar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ListOrdered className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Nenhuma conversão</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Afiliado</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Cupom</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Pedido</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Comissão</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs uppercase text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((c) => (
                  <tr key={c.id_conversion}>
                    <td className="px-4 py-3">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3">{c.affiliate_user_nome || c.id_affiliate.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.coupon_code || "-"}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(c.order_total_cents)}</td>
                    <td className="px-4 py-3 text-right">{formatBRL(c.commission_cents)}</td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge>
                      {c.disputed && (
                        <Badge className="ml-1 bg-red-500/20 text-red-300">
                          <AlertTriangle className="mr-1 h-3 w-3" />Disputada
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.disputed && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDisputeTarget(c)
                            setDisputeAction("keep")
                            setDisputeReason("")
                          }}
                        >
                          Resolver
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!disputeTarget} onOpenChange={(o) => !o && setDisputeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver disputa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta conversão foi marcada como disputada após um estorno do pagamento. Escolha como resolver.
            </p>
            <div>
              <Label>Ação</Label>
              <Select value={disputeAction} onValueChange={(v) => setDisputeAction(v as "keep" | "reverse")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Manter pagamento (apenas limpar flag)</SelectItem>
                  <SelectItem value="reverse">Reverter comissão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo</Label>
              <Input value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeTarget(null)}>Cancelar</Button>
            <Button
              disabled={resolving}
              onClick={async () => {
                if (!disputeTarget) return
                setResolving(true)
                try {
                  const token = localStorage.getItem("token")
                  const res = await fetch(
                    `/api/admin/affiliate/conversions/${disputeTarget.id_conversion}/resolve-dispute`,
                    {
                      method: "POST",
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ action: disputeAction, reason: disputeReason || null }),
                    },
                  )
                  if (!res.ok) {
                    const err = await res.json()
                    alert(err.error || "Erro")
                    return
                  }
                  setDisputeTarget(null)
                  await load()
                } finally {
                  setResolving(false)
                }
              }}
            >
              {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────── Overview ───────────────────────────
interface Overview {
  affiliates: { total: number; active: number; paused: number; blocked: number }
  conversions: {
    total: number
    pending_cents: number
    approved_cents: number
    paid_cents: number
    reversed_cents: number
    disputed_count: number
  }
  batches: { draft: number; sent: number; open_cents: number }
  top_affiliates: Array<{
    id_affiliate: string
    nome: string
    email: string
    earned_cents: number
    conversions: number
  }>
}

function OverviewSection() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    fetch("/api/admin/affiliate/overview", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Afiliados ativos" value={data.affiliates.active} sub={`${data.affiliates.total} total`} />
        <MetricCard label="Comissão pendente" value={formatBRL(data.conversions.pending_cents)} sub="aguardando aprovação" />
        <MetricCard label="Em aberto" value={formatBRL(data.batches.open_cents)} sub={`${data.batches.draft} rascunho · ${data.batches.sent} enviado`} />
        <MetricCard
          label="Disputas"
          value={data.conversions.disputed_count}
          sub="a resolver"
          highlight={data.conversions.disputed_count > 0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Aprovadas" value={formatBRL(data.conversions.approved_cents)} />
        <MetricCard label="Pagas" value={formatBRL(data.conversions.paid_cents)} />
        <MetricCard label="Revertidas" value={formatBRL(data.conversions.reversed_cents)} />
        <MetricCard label="Conversões totais" value={data.conversions.total} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Top afiliados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.top_affiliates.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Sem dados</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Afiliado</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Conversões</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-muted-foreground">Ganhos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.top_affiliates.map((t) => (
                  <tr key={t.id_affiliate}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{t.nome || t.id_affiliate.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">{t.email}</div>
                    </td>
                    <td className="px-4 py-3 text-right">{t.conversions}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatBRL(t.earned_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}) {
  return (
    <Card className={`border-border bg-card ${highlight ? "border-red-500/50" : ""}`}>
      <CardContent className="p-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={`mt-1 text-2xl font-bold ${highlight ? "text-red-400" : "text-foreground"}`}>
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

// ─────────────────────────── Audit ───────────────────────────
interface AuditEntry {
  id_log: string
  entity: string
  entity_id: string | null
  action: string
  before_state: unknown
  after_state: unknown
  reason: string | null
  actor_user_id: string | null
  actor_nome: string | null
  actor_email: string | null
  created_at: string
}

function AuditSection() {
  const [rows, setRows] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState("ALL")
  const [actionFilter, setActionFilter] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const params = new URLSearchParams()
      if (entityFilter !== "ALL") params.set("entity", entityFilter)
      if (actionFilter) params.set("action", actionFilter)
      const res = await fetch(`/api/admin/affiliate/audit?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setRows(data.items || [])
    } finally {
      setLoading(false)
    }
  }, [entityFilter, actionFilter])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Entidade</Label>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="affiliate">Afiliado</SelectItem>
              <SelectItem value="affiliate_settings">Regra</SelectItem>
              <SelectItem value="affiliate_coupon_override">Override de cupom</SelectItem>
              <SelectItem value="affiliate_conversion">Conversão</SelectItem>
              <SelectItem value="affiliate_payout_batch">Lote de pagamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ação</Label>
          <Input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="ex: create" />
        </div>
        <Button onClick={load}>Aplicar</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <History className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium text-foreground">Sem registros</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Data</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Entidade</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Ação</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Ator</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-muted-foreground">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <>
                    <tr
                      key={r.id_log}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => toggle(r.id_log)}
                    >
                      <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.entity}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-muted">{r.action}</Badge>
                      </td>
                      <td className="px-4 py-3">{r.actor_nome || "sistema"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.reason || "-"}</td>
                    </tr>
                    {expanded.has(r.id_log) && (
                      <tr key={`${r.id_log}-x`} className="bg-muted/20">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="mb-1 font-medium text-muted-foreground">Antes</div>
                              <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono">
                                {JSON.stringify(r.before_state, null, 2) || "null"}
                              </pre>
                            </div>
                            <div>
                              <div className="mb-1 font-medium text-muted-foreground">Depois</div>
                              <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono">
                                {JSON.stringify(r.after_state, null, 2) || "null"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
