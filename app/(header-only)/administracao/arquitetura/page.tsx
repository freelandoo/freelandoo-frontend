"use client"

/**
 * Painel de Arquitetura (admin) — mapa vivo das funções do app.
 * 3 abas: Resumo (KPIs), Funções (inventário color-coded + curadoria) e Logs
 * (log de rotas para caçar erros). Estilo dark utilitário (padrão admin).
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Boxes, Loader2, RefreshCw, Search, AlertTriangle, GitCommitHorizontal,
  Archive, CircleDot, Trash2, X, Save, Activity, Layers, ServerCog, Download,
} from "lucide-react"

// ---------------------------------------------------------------------------
// tipos
// ---------------------------------------------------------------------------
interface ArchFn {
  id: string
  fn_key: string
  title: string
  description: string | null
  description_curated: string | null
  description_effective: string | null
  area: string | null
  kind: string
  repo: string
  file_path: string | null
  mount_path: string | null
  status: string
  curated_status: string | null
  effective_status: string
  git_committed: boolean
  git_pushed: boolean
  last_commit_sha: string | null
  last_commit_msg: string | null
  last_commit_at: string | null
  source: string
  is_archived: boolean
  notes: string | null
  tags: string[]
}
interface Summary {
  summary: { total: number; live: number; orphan: number; wip: number; deprecated: number; committed: number; pushed: number; uncommitted: number; last_synced_at: string | null }
  by_area: { area: string; total: number; orphan: number; uncommitted: number }[]
  logs_24h: { total: number; server_errors: number; client_errors: number; avg_ms: number }
  top_errors_24h: { route: string; method: string; hits: number; errors: number; worst_status: number; last_seen: string }[]
}
interface RouteLog {
  id: number; method: string; path: string; route_pattern: string | null
  status_code: number; duration_ms: number | null; user_id: string | null
  ip: string | null; error_message: string | null; created_at: string
}

type Tab = "resumo" | "funcoes" | "logs"

// ---------------------------------------------------------------------------
// helpers de estilo
// ---------------------------------------------------------------------------
function statusStyle(fn: { effective_status: string; git_committed: boolean; git_pushed: boolean; is_archived: boolean }) {
  if (fn.is_archived) return { label: "Arquivado", dot: "bg-gray-500", text: "text-gray-400", ring: "border-gray-500/30" }
  switch (fn.effective_status) {
    case "orphan": return { label: "Órfão", dot: "bg-red-500", text: "text-red-400", ring: "border-red-500/30" }
    case "wip": return { label: "WIP", dot: "bg-amber-500", text: "text-amber-400", ring: "border-amber-500/30" }
    case "deprecated": return { label: "Deprecated", dot: "bg-gray-500", text: "text-gray-400", ring: "border-gray-500/30" }
    default: // live
      if (fn.git_pushed) return { label: "Vivo · pushado", dot: "bg-green-500", text: "text-green-400", ring: "border-green-500/30" }
      if (fn.git_committed) return { label: "Vivo · commit local", dot: "bg-blue-500", text: "text-blue-400", ring: "border-blue-500/30" }
      return { label: "Vivo · não commitado", dot: "bg-orange-500", text: "text-orange-400", ring: "border-orange-500/30" }
  }
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
}

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
}

// ---------------------------------------------------------------------------
// página
// ---------------------------------------------------------------------------
export default function ArquiteturaPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [tab, setTab] = useState<Tab>("resumo")

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

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Boxes className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Arquitetura</h1>
            <p className="text-sm text-muted-foreground">Mapa vivo das funções do app · órfãos · git · logs</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-border">
          {([["resumo", "Resumo", Activity], ["funcoes", "Funções", Layers], ["logs", "Logs", ServerCog]] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "resumo" && <ResumoTab />}
        {tab === "funcoes" && <FuncoesTab />}
        {tab === "logs" && <LogsTab />}
      </main>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Resumo
// ---------------------------------------------------------------------------
function ResumoTab() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/architecture/summary", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  async function sync() {
    setSyncing(true); setMsg(null)
    try {
      const r = await fetch("/api/admin/architecture/sync", { method: "POST", headers: authHeaders() })
      const d = await r.json()
      setMsg(r.ok ? `Sincronizado: ${d.inserted} novos, ${d.updated} atualizados, ${d.skipped} ignorados.` : (d.error || "Erro ao sincronizar."))
      if (r.ok) load()
    } catch { setMsg("Erro de rede ao sincronizar.") } finally { setSyncing(false) }
  }

  if (loading) return <Spinner />
  if (!data) return <Empty label="Sem dados de resumo." />

  const s = data.summary
  const pushPct = s.total ? Math.round((s.pushed / s.total) * 100) : 0
  const commitPct = s.total ? Math.round((s.committed / s.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Último sync: {fmtDate(s.last_synced_at)} · roda <code className="text-foreground">npm run arch:scan</code> e atualiza no deploy/boot
        </p>
        <button onClick={sync} disabled={syncing}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:border-primary/40 hover:text-primary disabled:opacity-50">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Recarregar manifesto
        </button>
      </div>
      {msg && <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">{msg}</p>}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <Kpi label="Total" value={s.total} icon={<Boxes className="h-4 w-4 text-primary" />} />
        <Kpi label="Vivos" value={s.live} icon={<CircleDot className="h-4 w-4 text-green-500" />} />
        <Kpi label="Órfãos" value={s.orphan} icon={<AlertTriangle className="h-4 w-4 text-red-500" />} accent="text-red-400" />
        <Kpi label="WIP" value={s.wip} icon={<CircleDot className="h-4 w-4 text-amber-500" />} accent="text-amber-400" />
        <Kpi label="Não commitado" value={s.uncommitted} icon={<GitCommitHorizontal className="h-4 w-4 text-orange-500" />} accent="text-orange-400" />
        <Kpi label="Deprecated" value={s.deprecated} icon={<Archive className="h-4 w-4 text-gray-500" />} accent="text-gray-400" />
      </div>

      {/* Barras commit/push */}
      <div className="grid gap-3 md:grid-cols-2">
        <Bar label="Commitado" pct={commitPct} count={s.committed} total={s.total} color="bg-blue-500" />
        <Bar label="Pushado (origin/main)" pct={pushPct} count={s.pushed} total={s.total} color="bg-green-500" />
      </div>

      {/* Logs 24h */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Requests 24h" value={data.logs_24h.total} />
        <Kpi label="Erros 5xx" value={data.logs_24h.server_errors} accent="text-red-400" />
        <Kpi label="Erros 4xx" value={data.logs_24h.client_errors} accent="text-amber-400" />
        <Kpi label="Latência média" value={`${data.logs_24h.avg_ms}ms`} />
      </div>

      {/* Por área */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Por área</h3>
        <div className="space-y-1.5">
          {data.by_area.map((a) => (
            <div key={a.area} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{a.area}</span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{a.total} fn</span>
                {a.orphan > 0 && <span className="text-red-400">{a.orphan} órfã{a.orphan > 1 ? "s" : ""}</span>}
                {a.uncommitted > 0 && <span className="text-orange-400">{a.uncommitted} s/ commit</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top erros */}
      {data.top_errors_24h.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Rotas com erro (24h)</h3>
          <div className="space-y-1.5">
            {data.top_errors_24h.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-mono text-xs text-foreground"><span className="text-muted-foreground">{e.method}</span> {e.route}</span>
                <span className="text-xs text-red-400">{e.errors} erro{e.errors > 1 ? "s" : ""} · {e.worst_status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Funções
// ---------------------------------------------------------------------------
function FuncoesTab() {
  const [items, setItems] = useState<ArchFn[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("")
  const [repo, setRepo] = useState("")
  const [kind, setKind] = useState("")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<ArchFn | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status === "uncommitted") params.set("committed", "false")
    else if (status) params.set("status", status)
    if (repo) params.set("repo", repo)
    if (kind) params.set("kind", kind)
    params.set("page", String(page))
    params.set("per_page", "100")
    fetch(`/api/admin/architecture/functions?${params}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setItems(d.functions || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }, [q, status, repo, kind, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [q, status, repo, kind])

  function exportCsv() {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status === "uncommitted") params.set("committed", "false")
    else if (status) params.set("status", status)
    if (repo) params.set("repo", repo)
    if (kind) params.set("kind", kind)
    params.set("format", "csv")
    fetch(`/api/admin/architecture/functions?${params}`, { headers: authHeaders() })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `arch-functions-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, arquivo, área…"
            className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none" />
        </div>
        <Select value={status} onChange={setStatus} options={[["", "Todos status"], ["live", "Vivo"], ["uncommitted", "Não-commitado"], ["orphan", "Órfão"], ["wip", "WIP"], ["deprecated", "Deprecated"]]} />
        <Select value={repo} onChange={setRepo} options={[["", "Todos repos"], ["frontend", "Frontend"], ["backend", "Backend"]]} />
        <Select value={kind} onChange={setKind} options={[["", "Todos tipos"], ["page", "Página"], ["proxy", "Proxy"], ["component", "Componente"], ["button", "Botão"], ["route", "Rota"], ["service", "Service"], ["hook", "Hook"]]} />
        <button onClick={exportCsv} title="Exportar CSV (respeita filtros)"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:border-primary/40 hover:text-primary">
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{total} função{total !== 1 ? "ões" : ""}</p>

      {loading ? <Spinner /> : items.length === 0 ? <Empty label="Nenhuma função encontrada." /> : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {items.map((fn) => {
              const st = statusStyle(fn)
              return (
                <button key={fn.id} onClick={() => setSelected(fn)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} title={st.label} />
                  <div className="min-w-0 flex-1 md:flex-none md:w-[240px] lg:w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{fn.title}</span>
                      <span className="shrink-0 rounded bg-muted/50 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">{fn.kind}</span>
                      {fn.is_archived && <Archive className="h-3 w-3 text-gray-500" />}
                      {fn.notes && <span className="shrink-0 text-[10px] text-primary">●</span>}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">{fn.file_path}</p>
                  </div>
                  {/* coluna do meio: narração da função prática */}
                  <p className="hidden flex-1 min-w-0 text-[12px] leading-snug text-muted-foreground md:line-clamp-2 md:block">
                    {fn.description_effective || fn.description || <span className="italic opacity-50">sem descrição</span>}
                    {fn.description_curated && <span className="ml-1 align-middle text-[9px] uppercase text-primary/70">curado</span>}
                  </p>
                  <span className="shrink-0 text-[11px] text-muted-foreground hidden xl:block w-20 truncate text-right">{fn.area}</span>
                  <span className={`shrink-0 text-[11px] ${st.text} w-28 text-right`}>{st.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {total > 100 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">Anterior</button>
          <span className="text-sm text-muted-foreground">Página {page} de {Math.ceil(total / 100)}</span>
          <button onClick={() => setPage((p) => (p * 100 < total ? p + 1 : p))} disabled={page * 100 >= total}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">Próxima</button>
        </div>
      )}

      {selected && <CurateModal fn={selected} onClose={() => setSelected(null)} onSaved={(updated) => {
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
        setSelected(null)
      }} />}
    </div>
  )
}

function CurateModal({ fn, onClose, onSaved }: { fn: ArchFn; onClose: () => void; onSaved: (f: ArchFn) => void }) {
  const [curatedStatus, setCuratedStatus] = useState(fn.curated_status || "")
  const [notes, setNotes] = useState(fn.notes || "")
  const [archived, setArchived] = useState(fn.is_archived)
  const [descCurated, setDescCurated] = useState(fn.description_curated || "")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // texto exibido em destaque = override do admin, ou narração do scan.
  const effectiveDesc = (descCurated || fn.description || "").trim()

  async function save() {
    setSaving(true); setErr(null)
    try {
      const r = await fetch(`/api/admin/architecture/functions/${fn.id}`, {
        method: "PATCH", headers: authHeaders(),
        body: JSON.stringify({ curated_status: curatedStatus || null, notes: notes || null, is_archived: archived, description_curated: descCurated || null }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.error || "Erro ao salvar."); return }
      onSaved(d.function)
    } catch { setErr("Erro de rede.") } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{fn.title}</h3>
            <p className="truncate text-xs text-muted-foreground">{fn.file_path}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Narração da função prática — em destaque (fundo amarelo, letras pretas) */}
        <div className="mb-4 rounded-lg bg-yellow-400 px-4 py-3 text-black">
          <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-black/60">O que essa função faz</p>
          <p className="text-sm font-medium leading-snug">
            {effectiveDesc || <span className="italic opacity-60">Sem descrição — escreva uma abaixo.</span>}
          </p>
        </div>

        <dl className="mb-4 grid grid-cols-2 gap-2 text-xs">
          <Meta label="Tipo / repo" value={`${fn.kind} · ${fn.repo}`} />
          <Meta label="Área" value={fn.area || "—"} />
          <Meta label="Montado em" value={fn.mount_path || "— (órfão)"} />
          <Meta label="Status do scan" value={fn.status} />
          <Meta label="Commit" value={fn.git_committed ? (fn.git_pushed ? "pushado" : "local") : "não commitado"} />
          <Meta label="Último commit" value={fn.last_commit_sha ? `${fn.last_commit_sha} · ${fmtDate(fn.last_commit_at)}` : "—"} />
        </dl>
        {fn.last_commit_msg && <p className="mb-4 rounded bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground">{fn.last_commit_msg}</p>}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Descrição / narração (sobrepõe a do scan)</label>
            <textarea value={descCurated} onChange={(e) => setDescCurated(e.target.value)} rows={3}
              placeholder={fn.description || "Explique em uma frase o que essa função faz na prática…"}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none" />
            <p className="mt-1 text-[10px] text-muted-foreground">Vazio = usa a narração automática do scan. O texto aqui aparece em amarelo acima e na lista.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status curado (sobrepõe o scan)</label>
            <Select value={curatedStatus} onChange={setCuratedStatus} full
              options={[["", "— (usa o do scan)"], ["live", "Vivo"], ["orphan", "Órfão"], ["wip", "WIP"], ["deprecated", "Deprecated"]]} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Ex: órfão de propósito, aguardando feature X / candidato a remoção…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="accent-primary" />
            Arquivar (marcar para limpeza)
          </label>
        </div>

        {err && <p className="mt-3 text-sm text-red-400">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Aba Logs
// ---------------------------------------------------------------------------
function LogsTab() {
  const [items, setItems] = useState<RouteLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [errorsOnly, setErrorsOnly] = useState(true)
  const [pathFilter, setPathFilter] = useState("")
  const [page, setPage] = useState(1)
  const [purging, setPurging] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (errorsOnly) params.set("errors_only", "true")
    if (pathFilter) params.set("path", pathFilter)
    params.set("page", String(page))
    params.set("per_page", "100")
    fetch(`/api/admin/architecture/logs?${params}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => { setItems(d.logs || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }, [errorsOnly, pathFilter, page])
  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [errorsOnly, pathFilter])

  async function purge() {
    if (!window.confirm("Apagar logs com mais de 30 dias?")) return
    setPurging(true)
    try {
      const r = await fetch("/api/admin/architecture/logs?older_than_days=30", { method: "DELETE", headers: authHeaders() })
      const d = await r.json()
      window.alert(r.ok ? `${d.purged} logs apagados.` : (d.error || "Erro."))
      if (r.ok) load()
    } catch { window.alert("Erro de rede.") } finally { setPurging(false) }
  }

  function statusColor(code: number) {
    if (code >= 500) return "text-red-400"
    if (code >= 400) return "text-amber-400"
    if (code >= 300) return "text-blue-400"
    return "text-green-400"
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={pathFilter} onChange={(e) => setPathFilter(e.target.value)} placeholder="Filtrar por rota…"
            className="w-full rounded-lg border border-border bg-card pl-10 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none" />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} className="accent-primary" />
          Só erros (≥400)
        </label>
        <button onClick={purge} disabled={purging}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:border-red-500/40 hover:text-red-400 disabled:opacity-50">
          {purging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Limpar +30d
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{total} registro{total !== 1 ? "s" : ""}</p>

      {loading ? <Spinner /> : items.length === 0 ? <Empty label="Sem logs no filtro atual." /> : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Método</th>
                  <th className="px-3 py-2">Rota</th>
                  <th className="px-3 py-2 hidden md:table-cell">Erro</th>
                  <th className="px-3 py-2 text-right">ms</th>
                  <th className="px-3 py-2 text-right">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className={`px-3 py-2 font-mono font-semibold ${statusColor(l.status_code)}`}>{l.status_code}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{l.method}</td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground max-w-[280px] truncate">{l.path}</td>
                    <td className="px-3 py-2 hidden md:table-cell text-xs text-red-400/80 max-w-[260px] truncate">{l.error_message || "—"}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">{l.duration_ms ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {total > 100 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">Anterior</button>
          <span className="text-sm text-muted-foreground">Página {page} de {Math.ceil(total / 100)}</span>
          <button onClick={() => setPage((p) => (p * 100 < total ? p + 1 : p))} disabled={page * 100 >= total}
            className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40">Próxima</button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// componentes auxiliares
// ---------------------------------------------------------------------------
function Spinner() {
  return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
}
function Empty({ label }: { label: string }) {
  return <div className="rounded-lg border border-border bg-card py-16 text-center text-sm text-muted-foreground">{label}</div>
}
function Kpi({ label, value, icon, accent }: { label: string; value: number | string; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">{icon}<span className={`text-xl font-bold ${accent || "text-foreground"}`}>{value}</span></div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
function Bar({ label, pct, count, total, color }: { label: string; pct: number; count: number; total: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{count}/{total} · {pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}
function Select({ value, onChange, options, full }: { value: string; onChange: (v: string) => void; options: [string, string][]; full?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={`rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary/40 focus:outline-none ${full ? "w-full" : ""}`}>
      {options.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  )
}
