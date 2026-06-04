"use client"

import React, { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, ArrowLeft, Trash2, ImagePlus, Eye, EyeOff, ExternalLink } from "lucide-react"

interface AdminPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  cover_url: string | null
  category: string | null
  tags: string[]
  status: "draft" | "published"
  reading_minutes: number
  author_name: string
  views: number
  published_at: string | null
  updated_at: string
}

interface FullPost extends AdminPost {
  body_md: string
  cover_alt: string | null
  seo_title: string | null
  seo_description: string | null
}

type FormState = {
  title: string
  slug: string
  category: string
  tags: string
  excerpt: string
  body_md: string
  status: "draft" | "published"
  cover_alt: string
  seo_title: string
  seo_description: string
  author_name: string
}

const EMPTY: FormState = {
  title: "", slug: "", category: "", tags: "", excerpt: "", body_md: "",
  status: "draft", cover_alt: "", seo_title: "", seo_description: "", author_name: "Equipe Freelandoo",
}

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export default function AdminBlogPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [posts, setPosts] = useState<AdminPost[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<"list" | "editor">("list")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Auth guard ──
  useEffect(() => {
    const t = token()
    if (!t) {
      router.push("/login")
      return
    }
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${t}` } })
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
        setAuthChecked(true)
      })
      .catch(() => router.push("/"))
  }, [router])

  const loadPosts = useCallback(async () => {
    const t = token()
    if (!t) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/blog/posts", { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" })
      const data = await res.json()
      if (res.ok) setPosts(data.posts || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) void loadPosts()
  }, [isAdmin, loadPosts])

  function startNew() {
    setEditingId(null)
    setForm(EMPTY)
    setCoverFile(null)
    setCoverPreview(null)
    setError(null)
    setView("editor")
  }

  async function startEdit(id: string) {
    const t = token()
    if (!t) return
    setError(null)
    const res = await fetch(`/api/admin/blog/posts/${id}`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || "Erro ao carregar post")
      return
    }
    const p: FullPost = data.post
    setEditingId(p.id)
    setForm({
      title: p.title || "",
      slug: p.slug || "",
      category: p.category || "",
      tags: (p.tags || []).join(", "),
      excerpt: p.excerpt || "",
      body_md: p.body_md || "",
      status: p.status,
      cover_alt: p.cover_alt || "",
      seo_title: p.seo_title || "",
      seo_description: p.seo_description || "",
      author_name: p.author_name || "Equipe Freelandoo",
    })
    setCoverFile(null)
    setCoverPreview(p.cover_url || null)
    setView("editor")
  }

  function onPickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  async function save(publish?: boolean) {
    const t = token()
    if (!t) return
    if (!form.title.trim()) {
      setError("Título é obrigatório")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("title", form.title)
      if (form.slug.trim()) fd.append("slug", form.slug.trim())
      fd.append("category", form.category)
      fd.append("tags", form.tags)
      fd.append("excerpt", form.excerpt)
      fd.append("body_md", form.body_md)
      fd.append("seo_title", form.seo_title)
      fd.append("seo_description", form.seo_description)
      fd.append("author_name", form.author_name)
      const status = publish === undefined ? form.status : publish ? "published" : "draft"
      fd.append("status", status)
      fd.append("cover_alt", form.cover_alt)
      if (coverFile) fd.append("cover", coverFile)

      const url = editingId ? `/api/admin/blog/posts/${editingId}` : "/api/admin/blog/posts"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${t}` }, body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao salvar")
        return
      }
      await loadPosts()
      setView("list")
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(p: AdminPost) {
    const t = token()
    if (!t) return
    const fd = new FormData()
    fd.append("status", p.status === "published" ? "draft" : "published")
    const res = await fetch(`/api/admin/blog/posts/${p.id}`, { method: "PUT", headers: { Authorization: `Bearer ${t}` }, body: fd })
    if (res.ok) await loadPosts()
  }

  async function remove(p: AdminPost) {
    const t = token()
    if (!t) return
    if (!confirm(`Excluir "${p.title}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/blog/posts/${p.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) await loadPosts()
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
  const label = "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground"

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {view === "list" ? (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Blog</h1>
              <p className="text-sm text-muted-foreground">Gerencie os guias publicados em /blog</p>
            </div>
            <button
              onClick={startNew}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Novo post
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
              Nenhum post ainda. Clique em “Novo post”.
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">sem capa</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${p.status === "published" ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-500/15 text-zinc-400"}`}>
                        {p.status === "published" ? "Publicado" : "Rascunho"}
                      </span>
                      {p.category && <span className="text-[11px] text-muted-foreground">{p.category}</span>}
                    </div>
                    <p className="truncate font-medium text-foreground">{p.title}</p>
                    <p className="truncate text-xs text-muted-foreground">/{p.slug} · {p.reading_minutes} min · {p.views} views</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.status === "published" && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" title="Ver no site" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button onClick={() => togglePublish(p)} title={p.status === "published" ? "Despublicar" : "Publicar"} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                      {p.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => startEdit(p.id)} className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted">Editar</button>
                    <button onClick={() => remove(p)} title="Excluir" className="rounded-md p-2 text-red-400 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <button onClick={() => setView("list")} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <h1 className="mb-6 text-2xl font-bold text-foreground">{editingId ? "Editar post" : "Novo post"}</h1>

          {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div>
                <label className={label}>Título</label>
                <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Como precificar seus serviços..." />
              </div>
              <div>
                <label className={label}>Resumo (excerpt)</label>
                <textarea className={`${input} min-h-[70px]`} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Uma ou duas frases que aparecem no card e na busca." />
              </div>
              <div>
                <label className={label}>Conteúdo (Markdown)</label>
                <textarea className={`${input} min-h-[420px] font-mono text-[13px] leading-relaxed`} value={form.body_md} onChange={(e) => setForm({ ...form, body_md: e.target.value })} placeholder={"## Subtítulo\n\nTexto do post...\n\n- item\n- item"} />
                <p className="mt-1 text-xs text-muted-foreground">Use Markdown: ## títulos, **negrito**, listas com - e links [texto](url).</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={label}>Capa</label>
                <div className="overflow-hidden rounded-lg border border-border bg-muted">
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="" className="aspect-[16/9] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/9] w-full items-center justify-center text-xs text-muted-foreground">Sem capa</div>
                  )}
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-muted">
                  <ImagePlus className="h-4 w-4" /> {coverPreview ? "Trocar foto" : "Enviar foto"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickCover} />
                </label>
              </div>
              <div>
                <label className={label}>Texto alternativo da capa</label>
                <input className={input} value={form.cover_alt} onChange={(e) => setForm({ ...form, cover_alt: e.target.value })} placeholder="Descrição da imagem (acessibilidade/SEO)" />
              </div>
              <div>
                <label className={label}>Categoria</label>
                <input className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Primeiros passos" />
              </div>
              <div>
                <label className={label}>Tags (separadas por vírgula)</label>
                <input className={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="preço, serviços" />
              </div>
              <div>
                <label className={label}>Slug (opcional)</label>
                <input className={input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="gerado do título se vazio" />
              </div>
              <div>
                <label className={label}>Autor</label>
                <input className={input} value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} />
              </div>
              <details className="rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">SEO (opcional)</summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className={label}>SEO título</label>
                    <input className={input} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
                  </div>
                  <div>
                    <label className={label}>SEO descrição</label>
                    <textarea className={`${input} min-h-[60px]`} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
                  </div>
                </div>
              </details>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <button disabled={saving} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Publicar
            </button>
            <button disabled={saving} onClick={() => save(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50">
              Salvar como rascunho
            </button>
          </div>
        </>
      )}
    </div>
  )
}
