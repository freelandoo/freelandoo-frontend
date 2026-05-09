"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Loader2, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

type Product = {
  id: string
  name: string
  tag_label: string
  price_cents: number
  price_polens: number
  is_active: boolean
}

type UsageRow = {
  id: string
  user_id: string
  username: string
  display_name: string
  email: string
  payment_method: string
  amount_cents: number | null
  amount_polens: number | null
  acquired_at: string
  expires_at: string
  is_active: boolean
  subprofiles_applied: Array<{ id_profile: string; display_name: string | null; avatar_url: string | null }>
}

type UsageResponse = {
  product: Product
  users: UsageRow[]
  pagination: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

function fmtBRL(cents: number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100)
}

function fmtDate(value: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

export default function ManifestationUsagePage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  useEffect(() => {
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((user) => {
        const ok = user.is_admin || user.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!ok) { router.push("/"); return }
        setIsAdmin(true)
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router, token])

  const queryString = useMemo(() => {
    const search = new URLSearchParams()
    search.set("page", String(page))
    search.set("per_page", "20")
    search.set("sort", "acquired_at")
    search.set("order", "desc")
    if (q.trim()) search.set("q", q.trim())
    return search.toString()
  }, [page, q])

  const loadUsage = useCallback(async () => {
    if (!token || !id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/manifestations/products/${id}/usage?${queryString}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
      setData(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar uso")
    } finally {
      setLoading(false)
    }
  }, [id, queryString, token])

  useEffect(() => {
    if (isAdmin) loadUsage()
  }, [isAdmin, loadUsage])

  async function exportCsv() {
    if (!token || !id) return
    setExporting(true)
    try {
      const search = new URLSearchParams(queryString)
      search.set("format", "csv")
      const res = await fetch(`/api/admin/manifestations/products/${id}/usage?${search.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `manifestacao-${id}-usage.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao exportar CSV")
    } finally {
      setExporting(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="bg-page-shell-dark min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const product = data?.product
  const pagination = data?.pagination

  return (
    <div className="bg-page-shell-dark min-h-[100dvh]">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-[1200px] space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Button variant="ghost" size="sm" onClick={() => router.push("/administracao/manifestacao")} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Manifestacao
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Uso do produto
              </h1>
              <p className="mt-1 text-sm text-white/55">
                {product ? product.name : "Carregando produto..."}
              </p>
            </div>
            <Button onClick={exportCsv} disabled={exporting || !data} className="bg-primary text-zinc-950 hover:bg-primary/90">
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exportar CSV
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          )}

          <Card className="border-white/10 bg-white/[0.02]">
            <CardHeader>
              <CardTitle className="text-white">Usuarios do produto</CardTitle>
              <CardDescription>
                {pagination ? `${pagination.total} registro(s)` : "Compras e aplicacoes por subperfil"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                  <Input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1) }}
                    placeholder="Buscar por username, nome ou email"
                    className="pl-9"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !data || data.users.length === 0 ? (
                <div className="py-12 text-center text-sm text-white/55">Nenhum usuario encontrado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-left text-sm">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/40">
                      <tr>
                        <th className="py-3 pr-4 font-medium">Usuario</th>
                        <th className="py-3 pr-4 font-medium">Pagamento</th>
                        <th className="py-3 pr-4 font-medium">Valor</th>
                        <th className="py-3 pr-4 font-medium">Vigencia</th>
                        <th className="py-3 pr-4 font-medium">Subperfis</th>
                        <th className="py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.users.map((row) => (
                        <tr key={row.id} className="text-white/75">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-white">@{row.username}</div>
                            <div className="text-xs text-white/45">{row.display_name} · {row.email}</div>
                          </td>
                          <td className="py-3 pr-4 capitalize">{row.payment_method}</td>
                          <td className="py-3 pr-4">
                            <div>{fmtBRL(row.amount_cents)}</div>
                            <div className="text-xs text-primary">{Number(row.amount_polens || 0).toLocaleString("pt-BR")} P</div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="text-xs">Compra: {fmtDate(row.acquired_at)}</div>
                            <div className="text-xs text-white/45">Expira: {fmtDate(row.expires_at)}</div>
                          </td>
                          <td className="py-3 pr-4">
                            {row.subprofiles_applied.length === 0 ? (
                              <span className="text-xs text-white/35">Nenhum</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {row.subprofiles_applied.map((p) => (
                                  <Badge key={p.id_profile} variant="outline" className="border-white/15 text-white/70">
                                    {p.display_name || p.id_profile.slice(0, 8)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge className={row.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}>
                              {row.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {pagination && (
                <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-white/55">
                  <span>Pagina {pagination.page} de {pagination.total_pages}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={pagination.page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>
                      Proxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
