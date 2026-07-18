"use client"

/**
 * Clusters de Live (admin) — lista + criação. Cada cluster abre a sala de
 * comando em /administracao/clusters/[id] (membros, botões de sinal,
 * Iniciar/Encerrar sincronizado). Estilo dark utilitário, pt-only (padrão
 * admin), cantos retos (.fl-sharp).
 */
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Plus, Radio, RefreshCw, Trash2, Users, ChevronRight } from "lucide-react"

interface Cluster {
  id_live_cluster: string
  name: string
  status: "idle" | "started"
  started_at: string | null
  is_active: boolean
  member_count: number
  created_at: string
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

export default function ClustersAdminPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) { router.push("/login"); return }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const isAdmin = data.is_admin || data.roles?.some((r: { desc_role: string }) => r.desc_role === "Administrator")
        if (!isAdmin) { router.push("/"); return }
        setCheckingAuth(false)
      })
      .catch(() => router.push("/"))
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/live-clusters", { headers: authHeaders(), cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setClusters(data.clusters || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar clusters")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (!checkingAuth) load() }, [checkingAuth, load])

  const handleCreate = useCallback(async () => {
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/live-clusters", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setNewName("")
      router.push(`/administracao/clusters/${data.cluster.id_live_cluster}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cluster")
    } finally {
      setCreating(false)
    }
  }, [newName, creating, router])

  const handleDelete = useCallback(async (cluster: Cluster) => {
    if (!window.confirm(`Excluir o cluster "${cluster.name}"? Membros e botões somem junto.`)) return
    setDeletingId(cluster.id_live_cluster)
    try {
      const res = await fetch(`/api/admin/live-clusters/${cluster.id_live_cluster}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
      setClusters((prev) => prev.filter((c) => c.id_live_cluster !== cluster.id_live_cluster))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir cluster")
    } finally {
      setDeletingId(null)
    }
  }, [])

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fl-sharp min-h-screen bg-background">
      <main className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Radio className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clusters de Live</h1>
            <p className="text-sm text-muted-foreground">
              Sala de comando: adicione usuários, inicie todo mundo junto e dispare botões/textos gigantes.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            className="ml-auto flex h-9 w-9 items-center justify-center border border-border bg-card text-muted-foreground transition hover:text-foreground"
            aria-label="Atualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Criar */}
        <div className="border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Novo cluster</p>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value.slice(0, 80))}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
              placeholder="Nome do cluster (ex.: Live de sábado)"
              className="flex-1 border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || creating}
              className="inline-flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar
            </button>
          </div>
        </div>

        {error && (
          <p className="border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : clusters.length === 0 ? (
          <div className="border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            Nenhum cluster ainda. Crie o primeiro acima.
          </div>
        ) : (
          <div className="space-y-2">
            {clusters.map((cluster) => (
              <div
                key={cluster.id_live_cluster}
                className="flex items-center gap-3 border border-border bg-card p-4"
              >
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    cluster.status === "started"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 ${cluster.status === "started" ? "animate-pulse bg-green-400" : "bg-muted-foreground"}`} />
                  {cluster.status === "started" ? "Iniciado" : "Parado"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{cluster.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {cluster.member_count} {cluster.member_count === 1 ? "membro" : "membros"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(cluster)}
                  disabled={deletingId === cluster.id_live_cluster}
                  className="flex h-9 w-9 items-center justify-center border border-border text-muted-foreground transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                  aria-label="Excluir cluster"
                >
                  {deletingId === cluster.id_live_cluster
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
                <Link
                  href={`/administracao/clusters/${cluster.id_live_cluster}`}
                  className="inline-flex items-center gap-1 bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90"
                >
                  Sala de comando <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
