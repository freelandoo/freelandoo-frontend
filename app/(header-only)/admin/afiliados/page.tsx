"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, HandCoins, AlertTriangle, Clock, CheckCircle2, Search, Loader2, X, ChevronDown, Copy, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const THRESHOLD_DAYS = 20

type SummaryRow = {
  id_affiliate: string
  id_user: string
  user_name: string
  user_email: string
  affiliate_status: string
  red_cents: number
  green_cents: number
  paid_cents: number
  oldest_unpaid_at: string | null
  unpaid_count: number
}

type ConversionRow = {
  id_conversion: string
  id_order: string
  id_payout_item: string | null
  status: "PENDING" | "APPROVED" | "REVERSED" | "PAID"
  commission_cents: number
  commission_base_cents: number
  order_total_cents: number
  discount_cents: number
  created_at: string
  approved_at: string | null
  eligible_at: string | null
  paid_at: string | null
  coupon_code: string | null
}

type Lancamento = {
  id_conversion: string
  id_affiliate: string
  id_order: string
  status: "PENDING" | "APPROVED" | "REVERSED" | "PAID"
  commission_cents: number
  order_total_cents: number
  created_at: string
  approved_at: string | null
  paid_at: string | null
  coupon_code: string | null
  affiliate_name: string | null
  affiliate_email: string | null
  affiliate_pix_key: string | null
  affiliate_pix_key_type: string | null
  affiliate_legal_name: string | null
  affiliate_tax_id: string | null
}

type ModalFilter = "all" | "red" | "green" | "paid"
type PageStatusFilter = "all" | "red" | "green" | "paid"

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatBrl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function classifyConversion(c: ConversionRow): ModalFilter {
  if (c.status === "PAID") return "paid"
  if (c.status !== "APPROVED" || c.paid_at) return "paid"
  const ref = c.approved_at || c.created_at
  const d = daysSince(ref)
  if (d !== null && d > THRESHOLD_DAYS) return "red"
  return "green"
}

export default function AdminAfiliadosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [summary, setSummary] = useState<SummaryRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [pageFrom, setPageFrom] = useState("")
  const [pageTo, setPageTo] = useState("")
  const [pageStatusFilter, setPageStatusFilter] = useState<PageStatusFilter>("all")

  // Lançamentos (lista de conversões com dados PIX expansíveis)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [lancLoading, setLancLoading] = useState(false)
  const [lancError, setLancError] = useState<string | null>(null)
  const [expandedLancId, setExpandedLancId] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalAffiliate, setModalAffiliate] = useState<SummaryRow | null>(null)
  const [modalFilter, setModalFilter] = useState<ModalFilter>("all")
  const [modalConversions, setModalConversions] = useState<ConversionRow[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [modalFrom, setModalFrom] = useState("")
  const [modalTo, setModalTo] = useState("")
  const [modalQuery, setModalQuery] = useState("")
  const [paying, setPaying] = useState(false)
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("Não autorizado")))
      .then((u) => {
        const isAdmin = u.is_admin || u.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setAuthorized(true)
      })
      .catch(() => router.push("/"))
  }, [router])

  const loadSummary = async (from: string, to: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ threshold_days: String(THRESHOLD_DAYS) })
      if (from) params.set("from", from)
      if (to) params.set("to", `${to}T23:59:59`)
      const res = await fetch(`/api/admin/affiliate/payouts/summary?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar resumo")
      setSummary(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authorized) loadSummary(pageFrom, pageTo)
  }, [authorized, pageFrom, pageTo])

  const loadLancamentos = async (from: string, to: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setLancLoading(true)
    setLancError(null)
    try {
      const params = new URLSearchParams({ limit: "100" })
      if (from) params.set("from", from)
      if (to) params.set("to", `${to}T23:59:59`)
      const res = await fetch(`/api/admin/affiliate/conversions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar lançamentos")
      setLancamentos(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setLancError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLancLoading(false)
    }
  }

  useEffect(() => {
    if (authorized) loadLancamentos(pageFrom, pageTo)
  }, [authorized, pageFrom, pageTo])

  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l) => {
      if (pageStatusFilter === "all") return true
      if (pageStatusFilter === "paid") return l.status === "PAID"
      if (l.status !== "APPROVED" || l.paid_at) return false
      const ref = l.approved_at || l.created_at
      const days = daysSince(ref)
      const isRed = days !== null && days > THRESHOLD_DAYS
      if (pageStatusFilter === "red") return isRed
      if (pageStatusFilter === "green") return !isRed
      return true
    })
  }, [lancamentos, pageStatusFilter])

  const copyToClipboard = async (key: string, value: string | null | undefined) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500)
    } catch {
      // navegador sem clipboard
    }
  }

  const applyDatePreset = (days: number | null) => {
    if (days === null) {
      setPageFrom("")
      setPageTo("")
    } else {
      setPageFrom(isoDaysAgo(days))
      setPageTo(todayIso())
    }
  }

  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase()
    return summary.filter((r) => {
      if (q && !(r.user_name?.toLowerCase().includes(q) || r.user_email?.toLowerCase().includes(q))) {
        return false
      }
      if (pageStatusFilter === "red" && r.red_cents <= 0) return false
      if (pageStatusFilter === "green" && r.green_cents <= 0) return false
      if (pageStatusFilter === "paid" && r.paid_cents <= 0) return false
      return true
    })
  }, [summary, search, pageStatusFilter])

  const totals = useMemo(() => {
    return summary.reduce(
      (acc, r) => {
        acc.red += r.red_cents
        acc.green += r.green_cents
        acc.paid += r.paid_cents
        return acc
      },
      { red: 0, green: 0, paid: 0 }
    )
  }, [summary])

  const openModal = async (row: SummaryRow, initialFilter: ModalFilter) => {
    setModalAffiliate(row)
    setModalFilter(initialFilter)
    setModalFrom("")
    setModalTo("")
    setModalQuery("")
    setSelectedConvIds(new Set())
    setModalOpen(true)
    await fetchModalConversions(row.id_affiliate, "", "", "")
  }

  const fetchModalConversions = async (id_affiliate: string, from: string, to: string, q: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setModalLoading(true)
    setModalError(null)
    try {
      const params = new URLSearchParams()
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      if (q) params.set("q", q)
      const url = `/api/admin/affiliate/${id_affiliate}/conversions${params.toString() ? `?${params}` : ""}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao carregar conversões")
      setModalConversions(Array.isArray(data.items) ? data.items : [])
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setModalLoading(false)
    }
  }

  const filteredConversions = useMemo(() => {
    if (modalFilter === "all") return modalConversions
    return modalConversions.filter((c) => classifyConversion(c) === modalFilter)
  }, [modalConversions, modalFilter])

  const selectableConversions = useMemo(
    () => filteredConversions.filter((c) => c.status === "APPROVED" && !c.paid_at),
    [filteredConversions]
  )

  const selectedTotal = useMemo(() => {
    return modalConversions
      .filter((c) => selectedConvIds.has(c.id_conversion))
      .reduce((s, c) => s + c.commission_cents, 0)
  }, [modalConversions, selectedConvIds])

  const toggleSelect = (id: string) => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedConvIds((prev) => {
      const next = new Set(prev)
      const allSelected = selectableConversions.every((c) => next.has(c.id_conversion))
      if (allSelected) {
        selectableConversions.forEach((c) => next.delete(c.id_conversion))
      } else {
        selectableConversions.forEach((c) => next.add(c.id_conversion))
      }
      return next
    })
  }

  const handlePayNow = async () => {
    if (!modalAffiliate || selectedConvIds.size === 0) return
    const token = localStorage.getItem("token")
    if (!token) return
    if (!confirm(`Confirmar pagamento de ${formatBrl(selectedTotal)} (${selectedConvIds.size} comissões)?`)) return
    setPaying(true)
    try {
      const res = await fetch(`/api/admin/affiliate/${modalAffiliate.id_affiliate}/pay-now`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ conversion_ids: Array.from(selectedConvIds) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao confirmar pagamento")
      setSelectedConvIds(new Set())
      await fetchModalConversions(modalAffiliate.id_affiliate, modalFrom, modalTo, modalQuery)
      await loadSummary(pageFrom, pageTo)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao confirmar pagamento")
    } finally {
      setPaying(false)
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <HandCoins className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Afiliados</h1>
            <p className="text-sm text-muted-foreground">
              Comissões acumuladas. Vermelho = mais de {THRESHOLD_DAYS} dias (urgente, prazo total 30 dias).
            </p>
          </div>
        </div>

        {/* Totais globais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-red-500/40 bg-red-500/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">A pagar urgente (&gt; {THRESHOLD_DAYS}d)</p>
                <p className="text-xl font-bold text-red-500">{formatBrl(totals.red)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-500/40 bg-green-500/5">
            <CardContent className="pt-6 flex items-center gap-3">
              <Clock className="h-6 w-6 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">No prazo (&le; {THRESHOLD_DAYS}d)</p>
                <p className="text-xl font-bold text-green-600">{formatBrl(totals.green)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Já pago</p>
                <p className="text-xl font-bold">{formatBrl(totals.paid)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros: período + status */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input type="date" value={pageFrom} onChange={(e) => setPageFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input type="date" value={pageTo} onChange={(e) => setPageTo(e.target.value)} />
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => applyDatePreset(7)}>7d</Button>
                <Button variant="outline" size="sm" onClick={() => applyDatePreset(30)}>30d</Button>
                <Button variant="outline" size="sm" onClick={() => applyDatePreset(90)}>90d</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyDatePreset(null)}
                  disabled={!pageFrom && !pageTo}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", "red", "green", "paid"] as PageStatusFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPageStatusFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                    pageStatusFilter === f
                      ? f === "red"
                        ? "bg-red-500 text-white border-red-500"
                        : f === "green"
                          ? "bg-green-600 text-white border-green-600"
                          : f === "paid"
                            ? "bg-muted-foreground text-background border-muted-foreground"
                            : "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {f === "all"
                    ? "Todos"
                    : f === "red"
                      ? "Urgente"
                      : f === "green"
                        ? "No prazo"
                        : "Pago"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-lg">Afiliados com comissões</CardTitle>
              <div className="relative w-72 max-w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : filteredSummary.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhum afiliado com comissões.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSummary.map((row) => {
                  const hasRed = row.red_cents > 0
                  const oldest = daysSince(row.oldest_unpaid_at)
                  return (
                    <div
                      key={row.id_affiliate}
                      className={`rounded-lg border p-4 ${hasRed ? "border-red-500/60 bg-red-500/5" : "border-border"}`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <div className="min-w-0">
                          <p className={`font-semibold truncate ${hasRed ? "text-red-500" : ""}`}>
                            {row.user_name || row.user_email}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{row.user_email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasRed && oldest !== null && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {oldest}d sem pagar
                            </Badge>
                          )}
                          {row.affiliate_status !== "ACTIVE" && (
                            <Badge variant="outline" className="text-xs">{row.affiliate_status}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(row, "red")}
                          disabled={row.red_cents === 0}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500/10 border-red-500/40 bg-red-500/5"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <span className="text-red-500 font-medium">Urgente</span>
                          </span>
                          <span className="font-semibold text-red-500">{formatBrl(row.red_cents)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openModal(row, "green")}
                          disabled={row.green_cents === 0}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-500/10 border-green-500/40 bg-green-500/5"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 font-medium">No prazo</span>
                          </span>
                          <span className="font-semibold text-green-600">{formatBrl(row.green_cents)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openModal(row, "paid")}
                          disabled={row.paid_cents === 0}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-left transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium">Pago</span>
                          </span>
                          <span className="font-semibold text-muted-foreground">{formatBrl(row.paid_cents)}</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lançamentos: tabela de conversões com dados PIX expansíveis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-lg">Lançamentos</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em uma linha para ver os dados de PIX do afiliado.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {filteredLancamentos.length} {filteredLancamentos.length === 1 ? "lançamento" : "lançamentos"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {lancLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : lancError ? (
              <p className="text-sm text-destructive">{lancError}</p>
            ) : filteredLancamentos.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhum lançamento neste filtro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                      <th className="px-3 py-2 font-medium">Usuário</th>
                      <th className="px-3 py-2 font-medium">Cupom</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Data / Hora</th>
                      <th className="px-3 py-2 font-medium text-right">Valor</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLancamentos.map((l) => {
                      const expanded = expandedLancId === l.id_conversion
                      const dt = new Date(l.created_at)
                      const statusColor =
                        l.status === "PAID"
                          ? "bg-muted text-muted-foreground"
                          : l.status === "APPROVED"
                            ? l.paid_at
                              ? "bg-muted text-muted-foreground"
                              : (() => {
                                  const days = daysSince(l.approved_at || l.created_at)
                                  return days !== null && days > THRESHOLD_DAYS
                                    ? "bg-red-500/15 text-red-500 border-red-500/30"
                                    : "bg-green-500/15 text-green-600 border-green-500/30"
                                })()
                            : l.status === "REVERSED"
                              ? "bg-orange-500/15 text-orange-500 border-orange-500/30"
                              : "bg-yellow-500/15 text-yellow-500 border-yellow-500/30"
                      return (
                        <Fragment key={l.id_conversion}>
                          <tr
                            className="border-b hover:bg-muted/40 cursor-pointer transition"
                            onClick={() =>
                              setExpandedLancId((prev) => (prev === l.id_conversion ? null : l.id_conversion))
                            }
                          >
                            <td className="px-3 py-3">
                              <p className="font-medium leading-tight">{l.affiliate_name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{l.affiliate_email || ""}</p>
                            </td>
                            <td className="px-3 py-3">
                              {l.coupon_code ? (
                                <Badge variant="outline" className="text-xs font-mono">
                                  {l.coupon_code}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase border ${statusColor}`}
                              >
                                {l.status}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground tabular-nums">
                              {dt.toLocaleDateString("pt-BR")}, {dt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-3 py-3 text-right font-semibold tabular-nums">
                              {formatBrl(l.commission_cents)}
                            </td>
                            <td className="px-2 py-3 text-muted-foreground">
                              <ChevronDown
                                className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                              />
                            </td>
                          </tr>
                          {expanded && (
                            <tr className="bg-muted/30">
                              <td colSpan={6} className="px-3 py-4">
                                <div className="space-y-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Dados de PIX do afiliado
                                  </p>
                                  {!l.affiliate_pix_key && !l.affiliate_legal_name && !l.affiliate_tax_id ? (
                                    <p className="text-sm text-muted-foreground italic">
                                      O afiliado ainda não cadastrou os dados de pagamento.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <PixField
                                        label="Tipo de chave"
                                        value={l.affiliate_pix_key_type}
                                        copyKey={`${l.id_conversion}:type`}
                                        copiedKey={copiedKey}
                                        onCopy={copyToClipboard}
                                      />
                                      <PixField
                                        label="Chave PIX"
                                        value={l.affiliate_pix_key}
                                        copyKey={`${l.id_conversion}:key`}
                                        copiedKey={copiedKey}
                                        onCopy={copyToClipboard}
                                      />
                                      <PixField
                                        label="Nome / Razão social"
                                        value={l.affiliate_legal_name}
                                        copyKey={`${l.id_conversion}:legal`}
                                        copiedKey={copiedKey}
                                        onCopy={copyToClipboard}
                                      />
                                      <PixField
                                        label="CPF / CNPJ"
                                        value={l.affiliate_tax_id}
                                        copyKey={`${l.id_conversion}:tax`}
                                        copiedKey={copiedKey}
                                        onCopy={copyToClipboard}
                                      />
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                                    <p className="text-xs text-muted-foreground">
                                      Venda <span className="font-mono">{l.id_order.slice(0, 8)}</span> · base{" "}
                                      {formatBrl(l.order_total_cents)}
                                      {l.paid_at && (
                                        <> · pago {new Date(l.paid_at).toLocaleDateString("pt-BR")}</>
                                      )}
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        const row = summary.find((s) => s.id_affiliate === l.id_affiliate)
                                        if (row) openModal(row, "all")
                                      }}
                                    >
                                      Ver no painel do afiliado
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal de detalhes */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-primary" />
              {modalAffiliate?.user_name || modalAffiliate?.user_email}
            </DialogTitle>
            <DialogDescription>
              Comissões detalhadas. Selecione e confirme o pagamento.
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-3 border-b">
            <div className="space-y-1">
              <Label className="text-xs">De</Label>
              <Input type="date" value={modalFrom} onChange={(e) => setModalFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Até</Label>
              <Input type="date" value={modalTo} onChange={(e) => setModalTo(e.target.value)} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Buscar</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Cupom, id da venda…"
                  value={modalQuery}
                  onChange={(e) => setModalQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && modalAffiliate) {
                      fetchModalConversions(modalAffiliate.id_affiliate, modalFrom, modalTo, modalQuery)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => modalAffiliate && fetchModalConversions(modalAffiliate.id_affiliate, modalFrom, modalTo, modalQuery)}
                >
                  <Search className="h-4 w-4" />
                </Button>
                {(modalFrom || modalTo || modalQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setModalFrom("")
                      setModalTo("")
                      setModalQuery("")
                      if (modalAffiliate) fetchModalConversions(modalAffiliate.id_affiliate, "", "", "")
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs por status */}
          <div className="flex flex-wrap gap-2 pb-2">
            {(["all", "red", "green", "paid"] as ModalFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setModalFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                  modalFilter === f
                    ? f === "red" ? "bg-red-500 text-white border-red-500"
                      : f === "green" ? "bg-green-600 text-white border-green-600"
                      : f === "paid" ? "bg-muted-foreground text-background border-muted-foreground"
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {f === "all" ? "Todas" : f === "red" ? "Urgente" : f === "green" ? "No prazo" : "Pagas"}
              </button>
            ))}
          </div>

          {/* Lista de conversões */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {modalLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : modalError ? (
              <p className="text-sm text-destructive py-4">{modalError}</p>
            ) : filteredConversions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Sem comissões nesse filtro.</p>
            ) : (
              <div className="space-y-2">
                {selectableConversions.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectableConversions.every((c) => selectedConvIds.has(c.id_conversion))}
                      onChange={toggleSelectAllVisible}
                    />
                    Selecionar todas pagáveis ({selectableConversions.length})
                  </div>
                )}
                {filteredConversions.map((c) => {
                  const cls = classifyConversion(c)
                  const dt = c.approved_at || c.created_at
                  const days = daysSince(dt)
                  const selectable = c.status === "APPROVED" && !c.paid_at
                  const checked = selectedConvIds.has(c.id_conversion)
                  return (
                    <div
                      key={c.id_conversion}
                      className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                        cls === "red" ? "border-red-500/40 bg-red-500/5"
                          : cls === "green" ? "border-green-500/40 bg-green-500/5"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {selectable ? (
                          <input
                            type="checkbox"
                            className="h-4 w-4 shrink-0"
                            checked={checked}
                            onChange={() => toggleSelect(c.id_conversion)}
                          />
                        ) : (
                          <div className="w-4 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.coupon_code && (
                              <Badge variant="outline" className="text-xs font-mono">{c.coupon_code}</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">{c.status}</Badge>
                            {cls === "red" && days !== null && (
                              <span className="text-xs text-red-500 font-medium">{days}d</span>
                            )}
                            {cls === "green" && days !== null && (
                              <span className="text-xs text-green-600">{days}d</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            Venda {c.id_order.slice(0, 8)} · {new Date(dt).toLocaleString("pt-BR")}
                            {c.paid_at && ` · pago ${new Date(c.paid_at).toLocaleDateString("pt-BR")}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{formatBrl(c.commission_cents)}</p>
                        <p className="text-[10px] text-muted-foreground">venda {formatBrl(c.order_total_cents)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer com ação de pagar */}
          {selectedConvIds.size > 0 && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">{selectedConvIds.size} selecionada(s) · </span>
                <span className="font-semibold">{formatBrl(selectedTotal)}</span>
              </div>
              <Button onClick={handlePayNow} disabled={paying}>
                {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirmando…</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar pagamento</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PixField({
  label,
  value,
  copyKey,
  copiedKey,
  onCopy,
}: {
  label: string
  value: string | null | undefined
  copyKey: string
  copiedKey: string | null
  onCopy: (key: string, value: string | null | undefined) => void
}) {
  const empty = !value
  const isCopied = copiedKey === copyKey
  return (
    <div className="rounded-md border bg-background px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <p className={`text-sm font-mono break-all ${empty ? "text-muted-foreground/60 italic" : ""}`}>
          {empty ? "—" : value}
        </p>
        {!empty && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCopy(copyKey, value)
            }}
            className="shrink-0 rounded p-1.5 hover:bg-muted transition"
            aria-label={`Copiar ${label}`}
            title="Copiar"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}
