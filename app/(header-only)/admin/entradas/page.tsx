"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Loader2,
  Search,
  TrendingUp,
  Receipt,
  X,
} from "lucide-react"

type Tipo =
  | "assinatura"
  | "taxa_agenda"
  | "comissao_loja"
  | "venda_polens"
  | "premium"
  | "manifestacao"

interface Transaction {
  occurred_at: string | null
  id_user: string
  user_name: string
  user_email: string
  id_profile: string | null
  profile_name: string | null
  profile_category: string | null
  tipo: Tipo
  amount_cents: number
}

const TIPO_META: Record<Tipo, { label: string; badge: string }> = {
  assinatura: {
    label: "Perfil novo",
    badge: "bg-primary/15 text-primary border-primary/30",
  },
  taxa_agenda: {
    label: "Taxa agenda",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  comissao_loja: {
    label: "Comissão Loja",
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  venda_polens: {
    label: "Venda Poléns",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  premium: {
    label: "Premium",
    badge: "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
  },
  manifestacao: {
    label: "Manifestação",
    badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
}

const TIPO_ORDER: Tipo[] = [
  "assinatura",
  "taxa_agenda",
  "comissao_loja",
  "venda_polens",
  "premium",
  "manifestacao",
]

function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100)
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function tipoBadge(tipo: Tipo) {
  const meta = TIPO_META[tipo]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
        meta?.badge ?? "bg-muted text-muted-foreground"
      }`}
    >
      {meta?.label ?? tipo}
    </span>
  )
}

export default function AdminEntradasPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [tipoFilter, setTipoFilter] = useState<Tipo | "">("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const fetchTransactions = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tipoFilter) params.set("tipo", tipoFilter)
      if (fromDate) params.set("from", fromDate)
      // inclui o dia inteiro do "até"
      if (toDate) params.set("to", `${toDate}T23:59:59`)
      const qs = params.toString()
      const res = await fetch(`/api/admin/transactions${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTransactions(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Erro ao buscar transações:", error)
    } finally {
      setLoading(false)
    }
  }, [tipoFilter, fromDate, toDate])

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const ok =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!ok) {
          router.push("/")
          return
        }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  useEffect(() => {
    if (isAdmin) fetchTransactions()
  }, [isAdmin, fetchTransactions])

  // Busca textual no client sobre o conjunto já filtrado pelo backend
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return transactions
    const term = searchTerm.toLowerCase()
    return transactions.filter(
      (t) =>
        t.user_name?.toLowerCase().includes(term) ||
        t.user_email?.toLowerCase().includes(term) ||
        t.profile_name?.toLowerCase().includes(term) ||
        TIPO_META[t.tipo]?.label.toLowerCase().includes(term),
    )
  }, [searchTerm, transactions])

  // Totais por tipo sobre o conjunto retornado (respeita filtros tipo/data)
  const { totalCents, byType } = useMemo(() => {
    const acc: Record<string, number> = {}
    let total = 0
    for (const t of transactions) {
      const cents = t.amount_cents ?? 0
      acc[t.tipo] = (acc[t.tipo] || 0) + cents
      total += cents
    }
    return { totalCents: total, byType: acc }
  }, [transactions])

  const hasFilters = tipoFilter || fromDate || toDate
  const clearFilters = () => {
    setTipoFilter("")
    setFromDate("")
    setToDate("")
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAdmin) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.push("/admin")}
          className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Receipt className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entradas</h1>
            <p className="text-sm text-muted-foreground">
              Extrato único de receita: ativações, taxas, comissão da Loja, venda
              de Poléns, Premium e Manifestação (pagos em R$)
            </p>
          </div>
        </div>

        {/* Total card */}
        <Card className="mb-4 border-border bg-card">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{formatCents(totalCents)}</p>
              <p className="text-xs text-muted-foreground">
                Total recebido{hasFilters ? " (filtrado)" : ""}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Per-type totals */}
        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TIPO_ORDER.map((tipo) => (
            <button
              key={tipo}
              onClick={() => setTipoFilter((cur) => (cur === tipo ? "" : tipo))}
              className={`rounded-lg border p-3 text-left transition-colors ${
                tipoFilter === tipo
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-muted/30"
              }`}
            >
              <div className="mb-1">{tipoBadge(tipo)}</div>
              <p className="text-sm font-bold text-foreground">
                {formatCents(byType[tipo] || 0)}
              </p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, email, perfil ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              De
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
              Até
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
          <Badge variant="outline" className="whitespace-nowrap border-primary/30 text-primary">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">Nenhuma entrada encontrada</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters
                  ? "Ajuste os filtros para ver mais resultados"
                  : "Quando houver receita, aparecerá aqui"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Usuário
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                      Perfil
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Data / Hora
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((t, i) => (
                    <tr
                      key={`${t.id_user}-${t.tipo}-${t.occurred_at}-${i}`}
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{t.user_name}</p>
                        <p className="text-xs text-muted-foreground">{t.user_email}</p>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        {t.profile_name ? (
                          <>
                            <p className="text-sm text-foreground">{t.profile_name}</p>
                            {t.profile_category && (
                              <p className="text-[10px] text-muted-foreground">
                                {t.profile_category}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{tipoBadge(t.tipo)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs text-muted-foreground">
                        {formatDateTime(t.occurred_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-foreground">
                        {formatCents(t.amount_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
