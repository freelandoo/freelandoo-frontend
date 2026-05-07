"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, HandCoins, AlertTriangle, Clock, CheckCircle2, Search, Loader2, X } from "lucide-react"
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
