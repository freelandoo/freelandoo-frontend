"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Flag,
  Loader2,
  Search,
  ShieldAlert,
  ShieldOff,
  X,
} from "lucide-react"
import { getToken } from "@/lib/auth"

type PostRow = {
  id: string
  title: string | null
  feed_kind: "feed" | "bees" | null
  published_at: string | null
  report_count: number
  top_report_reason: string | null
  is_banned: boolean
  banned_at: string | null
  id_profile: string
  owner_name: string | null
  owner_avatar: string | null
  owner_username: string | null
  machine_name: string | null
  machine_color: string | null
  first_media: {
    url: string
    type: "image" | "video"
    thumbnail_url: string | null
  } | null
}

type PostPreview = PostRow & {
  description: string | null
  media: Array<{ url: string; type: "image" | "video"; thumbnail_url: string | null }>
  reasons: Array<{ reason_category: string; count: number }>
}

const REASON_LABEL: Record<string, string> = {
  spam: "Spam",
  fraud: "Golpe",
  harassment: "Assédio",
  inappropriate: "Impróprio",
  hate: "Ódio",
  forbidden_item: "Proibido",
  personal_data: "Dados",
  other: "Outros",
}

export default function AdminPostsPage() {
  const router = useRouter()

  const [items, setItems] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [minReports, setMinReports] = useState(0)

  const [previewId, setPreviewId] = useState<string | null>(null)
  const [preview, setPreview] = useState<PostPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [acting, setActing] = useState(false)

  const load = useCallback(async () => {
    const tk = getToken()
    if (!tk) {
      setError("Faça login como admin")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams()
      if (q.trim()) qs.set("q", q.trim())
      if (minReports > 0) qs.set("min_reports", String(minReports))
      qs.set("page", String(page))
      qs.set("per_page", "24")

      const res = await fetch(`/api/admin/posts?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(Array.isArray(data.items) ? data.items : [])
      setTotalPages(Math.max(1, Number(data?.pagination?.total_pages) || 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [q, minReports, page])

  useEffect(() => { load() }, [load])

  const openPreview = async (id: string) => {
    setPreviewId(id)
    setPreview(null)
    setPreviewLoading(true)
    try {
      const tk = getToken()
      const res = await fetch(`/api/admin/posts/${id}`, {
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPreview(data.post || null)
    } catch (e) {
      console.error(e)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewId(null)
    setPreview(null)
  }

  const doBan = async (id: string) => {
    const tk = getToken()
    if (!tk) return
    setActing(true)
    try {
      const res = await fetch(`/api/admin/posts/${id}/ban`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (res.ok) {
        await load()
        closePreview()
      }
    } finally {
      setActing(false)
    }
  }

  const doUnban = async (id: string) => {
    const tk = getToken()
    if (!tk) return
    setActing(true)
    try {
      const res = await fetch(`/api/admin/posts/${id}/unban`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tk}` },
      })
      if (res.ok) {
        await load()
        closePreview()
      }
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <button
          onClick={() => router.push("/administracao")}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </button>

        <div className="mt-4 mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-white/10">
            <Flag className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Posts denunciados</h1>
            <p className="text-sm text-muted-foreground">
              Revisar denúncias, ver preview e banir/restaurar posts.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value) }}
              placeholder="Buscar por autor ou título"
              className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/50"
            />
          </div>
          <select
            value={minReports}
            onChange={(e) => { setPage(1); setMinReports(parseInt(e.target.value, 10) || 0) }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            <option value={0}>Todos</option>
            <option value={1}>≥ 1 denúncia</option>
            <option value={3}>≥ 3 denúncias</option>
            <option value={5}>≥ 5 denúncias</option>
            <option value={10}>≥ 10 denúncias</option>
          </select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
            <Flag className="mx-auto mb-3 h-7 w-7 opacity-50" />
            <p className="text-sm font-medium">Nenhum post listado</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Post</th>
                  <th className="px-3 py-2 text-left">Autor</th>
                  <th className="px-3 py-2 text-left">Máquina</th>
                  <th className="px-3 py-2 text-right">Denúncias</th>
                  <th className="px-3 py-2 text-left">Motivo top</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openPreview(it.id)}
                        className="flex items-center gap-3 text-left hover:text-primary"
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {it.first_media?.thumbnail_url || it.first_media?.url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={it.first_media.thumbnail_url || it.first_media.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {it.title || <span className="text-muted-foreground italic">Sem título</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {it.feed_kind === "bees" ? "Bees" : "Feed"}
                          </p>
                        </div>
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openPreview(it.id)}
                        className="text-left hover:text-primary"
                      >
                        {it.owner_name || it.owner_username || "—"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px]"
                        style={{
                          borderColor: it.machine_color ? `${it.machine_color}55` : "rgba(255,255,255,0.15)",
                          color: it.machine_color || "#fff",
                        }}
                      >
                        {it.machine_name || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span
                        className={`inline-flex min-w-7 justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          it.report_count >= 5
                            ? "bg-red-500/15 text-red-300"
                            : it.report_count > 0
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {it.report_count}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-[11px] text-muted-foreground">
                        {it.top_report_reason ? REASON_LABEL[it.top_report_reason] || it.top_report_reason : "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {it.is_banned ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
                          <ShieldOff className="h-3 w-3" /> Banido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                          <ShieldAlert className="h-3 w-3" /> Ativo
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="tabular-nums">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </main>

      {previewId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
        >
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
            <button
              type="button"
              onClick={closePreview}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            {previewLoading || !preview ? (
              <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando…
              </div>
            ) : (
              <div className="max-h-[85vh] overflow-y-auto">
                <div className="bg-zinc-950">
                  {preview.media.length > 0 ? (
                    <div className="grid grid-cols-1 gap-px">
                      {preview.media.slice(0, 4).map((m, i) => (
                        <div key={i} className="aspect-video bg-black">
                          {m.type === "video" ? (
                            <video
                              src={m.url}
                              poster={m.thumbnail_url || undefined}
                              controls
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={m.url}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center text-muted-foreground">
                      Sem mídia
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {preview.owner_name || preview.owner_username}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {preview.title || <span className="italic text-muted-foreground">Sem título</span>}
                  </h2>
                  {preview.description && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {preview.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {preview.reasons.map((r) => (
                      <span
                        key={r.reason_category}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] text-amber-200"
                      >
                        <Flag className="h-3 w-3" />
                        {REASON_LABEL[r.reason_category] || r.reason_category} · {r.count}
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    {preview.is_banned ? (
                      <button
                        type="button"
                        onClick={() => doUnban(preview.id)}
                        disabled={acting}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                        Restaurar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => doBan(preview.id)}
                        disabled={acting}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {acting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                        Banir e remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
