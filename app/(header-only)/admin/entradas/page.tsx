"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Search,
  TrendingUp,
  CalendarDays,
  Receipt,
} from "lucide-react"

interface Transaction {
  occurred_at: string | null
  id_user: string
  user_name: string
  user_email: string
  id_profile: string | null
  profile_name: string | null
  profile_category: string | null
  tipo: "assinatura" | "taxa_agenda"
  amount_cents: number
}

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
    second: "2-digit",
  })
}

function tipoBadge(tipo: string) {
  if (tipo === "assinatura") {
    return (
      <span className="inline-flex items-center rounded-full border bg-primary/15 text-primary border-primary/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
        Perfil novo
      </span>
    )
  }
  if (tipo === "taxa_agenda") {
    return (
      <span className="inline-flex items-center rounded-full border bg-blue-500/15 text-blue-400 border-blue-500/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
        Taxa agenda
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider">
      {tipo}
    </span>
  )
}

export default function AdminEntradasPage() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filtered, setFiltered] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

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
        fetchTransactions(token)
      })
      .catch(() => router.push("/"))
  }, [router])

  const fetchTransactions = async (token: string) => {
    try {
      const res = await fetch("/api/admin/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setTransactions(list)
        setFiltered(list)
      }
    } catch (error) {
      console.error("Erro ao buscar transações:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(transactions)
      return
    }
    const term = searchTerm.toLowerCase()
    setFiltered(
      transactions.filter(
        (t) =>
          t.user_name?.toLowerCase().includes(term) ||
          t.user_email?.toLowerCase().includes(term) ||
          t.profile_name?.toLowerCase().includes(term) ||
          t.tipo?.toLowerCase().includes(term),
      ),
    )
  }, [searchTerm, transactions])

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }
  if (!isAdmin) return null

  const totalCents = transactions.reduce((sum, t) => sum + (t.amount_cents ?? 0), 0)
  const subsCents = transactions
    .filter((t) => t.tipo === "assinatura")
    .reduce((sum, t) => sum + (t.amount_cents ?? 0), 0)
  const feesCents = transactions
    .filter((t) => t.tipo === "taxa_agenda")
    .reduce((sum, t) => sum + (t.amount_cents ?? 0), 0)

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
              Histórico de receitas: assinaturas e taxas de agendamento
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCents(totalCents)}</p>
                <p className="text-xs text-muted-foreground">Total recebido</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCents(subsCents)}</p>
                <p className="text-xs text-muted-foreground">Assinaturas</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <CalendarDays className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCents(feesCents)}</p>
                <p className="text-xs text-muted-foreground">Taxas de agendamento</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, email, perfil ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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
                Quando houver receita, aparecerá aqui
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
                      key={`${t.id_user}-${t.occurred_at}-${i}`}
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
