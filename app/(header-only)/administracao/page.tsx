"use client"

import React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  CreditCard,
  Loader2,
} from "lucide-react"

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
}

export default function AdministracaoPage() {
  const [users, setUsers] = useState<UserAdmin[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }

    // Verificar se o usuario e admin
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
        setIsAdmin(true)
        setCheckingAuth(false)
        fetchUsers(token)
      })
      .catch(() => {
        router.push("/")
      })
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
      console.error("Erro ao buscar usuarios:", error)
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
    const filtered = users.filter(
      (u) =>
        u.nome?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.estado?.toLowerCase().includes(term) ||
        u.municipio?.toLowerCase().includes(term),
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

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

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.ativo).length
  const paidUsers = users.filter((u) => u.taxa_paga).length
  const premiumUsers = users.filter((u) => u.premium).length

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Painel de Administração</h1>
              <p className="text-sm text-muted-foreground">Gerencie os usuários da plataforma</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/administracao/maquinas")} variant="outline">
              Máquinas
            </Button>
            <Button onClick={() => router.push("/administracao/afiliados")} variant="outline">
              Afiliados
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
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

        {/* Users Table */}
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
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Email
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground md:table-cell">
                      Local
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Ativo
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Taxa
                    </th>
                    <th className="hidden px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground sm:table-cell">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id_user}
                      className="transition-colors hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/freelancer/${u.id_user}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                        {u.nome}
                        {u.is_admin && (
                          <Badge className="ml-2 bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">Admin</Badge>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">{u.email}</td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-muted-foreground md:table-cell">
                        {u.municipio && u.estado ? `${u.municipio}, ${u.estado}` : u.estado || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {u.ativo ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {u.taxa_paga ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap px-4 py-3 text-center sm:table-cell">
                        {u.premium ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-muted-foreground" />
                        )}
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

function Star(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
