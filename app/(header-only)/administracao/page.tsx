"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  CreditCard,
  Loader2,
  Star,
  ChevronDown,
  ChevronRight,
  Receipt,
  Sparkles,
  Hexagon,
  Store,
  ShieldAlert,
  Calendar,
} from "lucide-react"

interface ProfileAdmin {
  id_profile: string
  display_name: string | null
  category: string
  machine: string | null
  machine_slug: string | null
  is_active: boolean
  is_visible: boolean
  deleted_at: string | null
  created_at: string
  is_paid: boolean
  subscription_status: string | null
  subscription_paid_at: string | null
  subscription_amount_cents: number | null
  total_spent_cents: number
}

interface UserAdmin {
  id_user: string
  nome: string
  email: string
  estado?: string
  municipio?: string
  ativo?: boolean
  premium?: boolean
  taxa_paga?: boolean
  is_admin?: boolean
  created_at?: string
  total_spent_cents?: number
  profiles_count?: number
  profiles?: ProfileAdmin[]
}

function formatCents(cents: number): string {
  if (!cents) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100)
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function subscriptionStatusBadge(status: string | null) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>
  const map: Record<string, { label: string; className: string }> = {
    active:   { label: "Ativa",    className: "bg-green-500/20 text-green-400 border-green-500/30" },
    past_due: { label: "Atrasada", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    pending:  { label: "Pendente", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    canceled: { label: "Cancelada",className: "bg-red-500/20 text-red-400 border-red-500/30" },
    expired:  { label: "Expirada", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
    failed:   { label: "Falhou",   className: "bg-red-500/20 text-red-400 border-red-500/30" },
  }
  const s = map[status] ?? { label: status, className: "bg-muted text-muted-foreground" }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.className}`}>
      {s.label}
    </span>
  )
}

export default function AdministracaoPage() {
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [updatingAdminId, setUpdatingAdminId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const isAdminFlag =
          data.is_admin ||
          data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdminFlag) {
          router.push("/")
          return
        }
        setCurrentUserId(data.id_user ?? data.id ?? null)
        setIsAdmin(true)
        setCheckingAuth(false)
        fetchUsers(token)
      })
      .catch(() => router.push("/"))
  }, [router])

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const userList = Array.isArray(data) ? data : data.users || []
        setUsers(userList)
        setFilteredUsers(userList)
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
      return
    }
    const term = searchTerm.toLowerCase()
    setFilteredUsers(
      users.filter(
        (u) =>
          u.nome?.toLowerCase().includes(term) ||
          u.email?.toLowerCase().includes(term) ||
          u.estado?.toLowerCase().includes(term) ||
          u.municipio?.toLowerCase().includes(term),
      ),
    )
  }, [searchTerm, users])

  async function toggleAdmin(user: UserAdmin, e: React.MouseEvent) {
    e.stopPropagation()
    if (user.id_user === currentUserId) return
    const willBeAdmin = !user.is_admin
    const action = willBeAdmin ? "promover" : "remover de admin"
    if (!window.confirm(`Tem certeza que deseja ${action} ${user.nome}?`)) return

    const token = localStorage.getItem("token")
    if (!token) return
    setUpdatingAdminId(user.id_user)
    try {
      const res = await fetch(`/api/admin/users/${user.id_user}/admin`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_admin: willBeAdmin }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        window.alert(data.error || "Erro ao atualizar admin.")
        return
      }
      setUsers((prev) =>
        prev.map((u) => (u.id_user === user.id_user ? { ...u, is_admin: willBeAdmin } : u))
      )
    } catch {
      window.alert("Erro de rede ao atualizar admin.")
    } finally {
      setUpdatingAdminId(null)
    }
  }

  function toggleRow(id_user: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id_user) ? next.delete(id_user) : next.add(id_user)
      return next
    })
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdmin) return null

  const totalUsers   = users.length
  const activeUsers  = users.filter((u) => u.ativo).length
  const paidUsers    = users.filter((u) => u.taxa_paga).length
  const premiumUsers = users.filter((u) => u.premium).length

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Administração</h1>
            <p className="text-sm text-muted-foreground">Usuários e perfis da plataforma</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="mb-8 flex flex-wrap gap-3">
          <button
            onClick={() => router.push("/administracao/anuidade")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Ativação do perfil
          </button>
          <button
            onClick={() => router.push("/administracao/taxas-agendamento")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Receipt className="h-4 w-4" />
            Taxas de Agendamento
          </button>
          <button
            onClick={() => router.push("/administracao/cupons")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Star className="h-4 w-4" />
            Cupons
          </button>
          <button
            onClick={() => router.push("/administracao/manifestacao")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Manifestação
          </button>
          <button
            onClick={() => router.push("/admin/polens")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Hexagon className="h-4 w-4 fill-amber-300 text-amber-300" />
            Poléns
          </button>
          <button
            onClick={() => router.push("/administracao/loja-payouts")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Store className="h-4 w-4" />
            Loja — Payouts
          </button>
          <button
            onClick={() => router.push("/administracao/loja")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Store className="h-4 w-4" />
            Loja
          </button>
          <button
            onClick={() => router.push("/administracao/booking-payouts")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Agendamentos — Payouts
          </button>
          <button
            onClick={() => router.push("/administracao/chat-moderation")}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <ShieldAlert className="h-4 w-4" />
            Moderação Chat
          </button>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{paidUsers}</p>
                <p className="text-xs text-muted-foreground">Taxa Paga</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center gap-3 p-4">
              <Star className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{premiumUsers}</p>
                <p className="text-xs text-muted-foreground">Premium</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, estado ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Badge variant="outline" className="whitespace-nowrap border-primary/30 text-primary">
            {filteredUsers.length} resultado{filteredUsers.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground">Nenhum usuário encontrado</p>
              <p className="text-sm text-muted-foreground">Tente alterar os termos de busca</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Perfis
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Usuário
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Premium
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ativo
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                      Local
                    </th>
                    <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                      Cadastro
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Total entradas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const expanded = expandedRows.has(u.id_user)
                    const profileCount = u.profiles_count ?? 0
                    return (
                      <React.Fragment key={u.id_user}>
                        {/* User row */}
                        <tr
                          className="transition-colors hover:bg-muted/30 cursor-pointer"
                          onClick={() => profileCount > 0 && toggleRow(u.id_user)}
                        >
                          {/* Qtd perfis com chevron */}
                          <td className="px-3 py-3 text-center">
                            {profileCount > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleRow(u.id_user)
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
                              >
                                {expanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                {profileCount}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </td>

                          {/* Nome + email */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {u.id_user !== currentUserId && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleAdmin(u, e)}
                                  disabled={updatingAdminId === u.id_user}
                                  title={u.is_admin ? "Remover privilégios de admin" : "Promover a admin"}
                                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-colors ${
                                    u.is_admin
                                      ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/25"
                                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary"
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {updatingAdminId === u.id_user ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : u.is_admin ? (
                                    <ShieldOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {u.nome}
                                  {u.is_admin && (
                                    <Badge className="ml-2 bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
                                      Admin
                                    </Badge>
                                  )}
                                </p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Premium */}
                          <td className="px-4 py-3 text-center">
                            {u.premium ? (
                              <Star className="mx-auto h-4 w-4 fill-primary text-primary" />
                            ) : (
                              <Star className="mx-auto h-4 w-4 text-muted-foreground/30" />
                            )}
                          </td>

                          {/* Ativo */}
                          <td className="px-4 py-3 text-center">
                            {u.ativo ? (
                              <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="mx-auto h-4 w-4 text-red-500" />
                            )}
                          </td>

                          {/* Local */}
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-muted-foreground md:table-cell">
                            {u.municipio && u.estado
                              ? `${u.municipio}, ${u.estado}`
                              : u.estado || "-"}
                          </td>

                          {/* Cadastro */}
                          <td className="hidden whitespace-nowrap px-4 py-3 text-center text-xs text-muted-foreground md:table-cell">
                            {formatDate(u.created_at)}
                          </td>

                          {/* Total entradas */}
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-foreground">
                            {formatCents(u.total_spent_cents ?? 0)}
                          </td>
                        </tr>

                        {/* Profile sub-rows */}
                        {expanded &&
                          (u.profiles ?? []).map((p) => (
                            <tr
                              key={p.id_profile}
                              className="border-t border-border/50 bg-muted/10 transition-colors hover:bg-muted/30 cursor-pointer"
                              onClick={() => router.push(`/freelancer/${p.id_profile}`)}
                            >
                              {/* Indent / anchor */}
                              <td className="px-3 py-2 text-center">
                                <span className="text-[10px] text-muted-foreground/50">└</span>
                              </td>

                              {/* Nome do perfil + categoria */}
                              <td className="px-4 py-2 pl-8">
                                <p className="text-xs font-medium text-foreground">
                                  {p.display_name || (
                                    <span className="italic text-muted-foreground">sem nome</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {p.category}
                                  {p.machine && ` · ${p.machine}`}
                                </p>
                              </td>

                              {/* Premium (is_paid) */}
                              <td className="px-4 py-2 text-center">
                                {p.is_paid ? (
                                  <Star className="mx-auto h-3.5 w-3.5 fill-primary text-primary" />
                                ) : (
                                  <Star className="mx-auto h-3.5 w-3.5 text-muted-foreground/30" />
                                )}
                              </td>

                              {/* Ativo: mesma regra da vitrine (flags + ativação ativa) */}
                              <td className="px-4 py-2 text-center">
                                {p.is_active && p.is_visible && !p.deleted_at && p.is_paid ? (
                                  <CheckCircle2 className="mx-auto h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <XCircle className="mx-auto h-3.5 w-3.5 text-red-500/60" />
                                )}
                              </td>

                              {/* Status de ativação (no lugar de Local) */}
                              <td className="hidden px-4 py-2 md:table-cell">
                                {subscriptionStatusBadge(p.subscription_status)}
                              </td>

                              {/* Data criação */}
                              <td className="hidden whitespace-nowrap px-4 py-2 text-center text-[10px] text-muted-foreground md:table-cell">
                                {formatDate(p.created_at)}
                              </td>

                              {/* Total entradas do perfil */}
                              <td className="whitespace-nowrap px-4 py-2 text-right text-xs text-muted-foreground">
                                {formatCents(p.total_spent_cents)}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
