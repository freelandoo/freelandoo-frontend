"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Clock, ImagePlus, Loader2, Save, Trash2, Eye, Pencil } from "lucide-react"
import { ContentAd } from "@/components/ads/content-ad"
import { BlogArticle } from "@/components/blog/blog-article"
import type { BlogPostFull, BlogPostCard } from "@/lib/blog"

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return ""
  }
}

function ImageDrop({ onFile }: { onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      onClick={() => ref.current?.click()}
      className="absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/45 text-sm text-white opacity-0 transition-opacity hover:opacity-100"
    >
      <ImagePlus className="h-7 w-7" />
      <span className="font-semibold uppercase tracking-wide">arraste ou clique para a capa</span>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ""
        }}
      />
    </div>
  )
}

export function BlogPostView({
  initial,
  related,
}: {
  initial: BlogPostFull
  related: BlogPostCard[]
}) {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [d, setD] = useState(initial)
  const [tagsText, setTagsText] = useState((initial.tags || []).join(", "))

  useEffect(() => {
    const t = getToken()
    if (!t) return
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((u) => {
        const admin =
          Boolean(u.is_admin) ||
          (Array.isArray(u.roles) && u.roles.some((r: { desc_role?: string }) => r.desc_role === "Administrator"))
        setIsAdmin(admin)
        if (admin) setEdit(true)
      })
      .catch(() => {})
  }, [])

  function set<K extends keyof BlogPostFull>(k: K, v: BlogPostFull[K]) {
    setD((s) => ({ ...s, [k]: v }))
  }

  async function uploadCover(file: File) {
    const t = getToken()
    if (!t) return
    setMsg("Enviando imagem…")
    try {
      const fd = new FormData()
      fd.append("cover", file)
      const res = await fetch("/api/admin/blog/uploads/cover", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const data = await res.json()
      if (data?.url) {
        set("cover_url", data.url)
        setMsg(null)
      } else setMsg(data?.error || "Falha no upload")
    } catch {
      setMsg("Falha no upload")
    }
  }

  async function save(publish?: boolean) {
    const t = getToken()
    if (!t) return
    if (!d.title.trim()) {
      setMsg("Título é obrigatório")
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append("title", d.title)
      fd.append("slug", d.slug)
      fd.append("excerpt", d.excerpt || "")
      fd.append("category", d.category || "")
      fd.append("tags", tagsText)
      fd.append("body_md", d.body_md || "")
      fd.append("cover_alt", d.cover_alt || "")
      fd.append("cover_url", d.cover_url || "")
      fd.append("author_name", d.author_name || "Equipe Freelandoo")
      fd.append("seo_title", d.seo_title || "")
      fd.append("seo_description", d.seo_description || "")
      const status = publish === undefined ? d.status : publish ? "published" : "draft"
      fd.append("status", status)

      const res = await fetch(`/api/admin/blog/posts/${d.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data?.error || "Falha ao salvar")
        return
      }
      setMsg("Salvo!")
      const newSlug = data?.post?.slug
      if (newSlug && newSlug !== d.slug) {
        router.replace(`/blog/${newSlug}`)
      } else {
        if (data?.post) setD((s) => ({ ...s, ...data.post }))
        router.refresh()
      }
      setTimeout(() => setMsg(null), 2500)
    } catch {
      setMsg("Falha ao salvar")
    } finally {
      setSaving(false)
    }
  }

  async function del() {
    const t = getToken()
    if (!t) return
    if (!confirm(`Excluir "${d.title}"? Esta ação não pode ser desfeita.`)) return
    await fetch(`/api/admin/blog/posts/${d.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } })
    router.push("/blog")
  }

  const editing = isAdmin && edit
  const inputBase = "w-full bg-transparent outline-none"

  return (
    <main className={`min-h-[100dvh] bg-white ${editing ? "pb-28" : ""}`}>
      <article className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
        <div className="flex items-center justify-between gap-3">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800">
            <ArrowLeft className="h-4 w-4" /> Voltar ao blog
          </Link>
          {isAdmin && (
            <div className="flex items-center gap-2">
              {d.status === "draft" && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Rascunho</span>
              )}
              <button
                onClick={() => setEdit((e) => !e)}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:border-zinc-400"
              >
                {edit ? <><Eye className="h-4 w-4" /> Ver como público</> : <><Pencil className="h-4 w-4" /> Editar</>}
              </button>
            </div>
          )}
        </div>

        <header className="mt-6">
          {editing ? (
            <input
              value={d.category || ""}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Categoria"
              className={`${inputBase} text-sm font-semibold uppercase tracking-[0.15em] text-amber-600 placeholder:text-amber-300`}
            />
          ) : (
            d.category && (
              <Link href={`/blog?category=${encodeURIComponent(d.category)}`} className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-600 hover:text-amber-700">
                {d.category}
              </Link>
            )
          )}

          {editing ? (
            <textarea
              value={d.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Título do post"
              rows={2}
              className={`${inputBase} mt-3 resize-none text-3xl font-bold leading-tight tracking-tight text-zinc-900 placeholder:text-zinc-300 md:text-4xl`}
            />
          ) : (
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-4xl">{d.title}</h1>
          )}

          {editing ? (
            <textarea
              value={d.excerpt || ""}
              onChange={(e) => set("excerpt", e.target.value)}
              placeholder="Resumo (aparece no card e na busca)"
              rows={2}
              className={`${inputBase} mt-4 resize-none text-lg leading-relaxed text-zinc-600 placeholder:text-zinc-300`}
            />
          ) : (
            d.excerpt && <p className="mt-4 text-lg leading-relaxed text-zinc-600">{d.excerpt}</p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-6 text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">{d.author_name}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(d.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {d.reading_minutes} min de leitura
            </span>
          </div>
        </header>

        {/* Capa */}
        {editing ? (
          <div className="relative mt-8 overflow-hidden rounded-3xl border border-zinc-200">
            <div className="relative aspect-[16/9] w-full bg-zinc-100">
              {d.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.cover_url} alt={d.cover_alt || ""} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-400">Sem capa</div>
              )}
              <ImageDrop onFile={uploadCover} />
            </div>
          </div>
        ) : (
          d.cover_url && (
            <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.cover_url} alt={d.cover_alt || d.title} className="w-full object-cover" />
            </div>
          )
        )}
        {editing && (
          <input
            value={d.cover_alt || ""}
            onChange={(e) => set("cover_alt", e.target.value)}
            placeholder="Texto alternativo da capa (acessibilidade/SEO)"
            className="mt-2 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-amber-300"
          />
        )}

        {/* Corpo */}
        <div className="mt-8">
          {editing ? (
            <textarea
              value={d.body_md}
              onChange={(e) => set("body_md", e.target.value)}
              placeholder={"## Subtítulo\n\nEscreva o post em Markdown...\n\n- item\n- item"}
              className="min-h-[460px] w-full rounded-2xl border border-zinc-200 bg-zinc-50 p-4 font-mono text-[13px] leading-relaxed text-zinc-800 outline-none focus:border-amber-300"
            />
          ) : (
            <BlogArticle markdown={d.body_md} />
          )}
          {editing && (
            <p className="mt-2 text-xs text-zinc-400">
              Markdown: <code>## título</code>, <code>**negrito**</code>, listas com <code>-</code>, links{" "}
              <code>[texto](url)</code>. Use “Ver como público” para conferir o resultado.
            </p>
          )}
        </div>

        {/* Tags */}
        {editing ? (
          <div className="mt-8 border-t border-zinc-200 pt-6">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Tags (separadas por vírgula)
            </label>
            <input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="preço, serviços"
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none focus:border-amber-300"
            />
          </div>
        ) : (
          d.tags?.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-zinc-200 pt-6">
              {d.tags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                  #{t}
                </span>
              ))}
            </div>
          )
        )}

        {/* SEO (só edição) */}
        {editing && (
          <details className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-zinc-500">SEO (opcional)</summary>
            <div className="mt-3 space-y-3">
              <input
                value={d.seo_title || ""}
                onChange={(e) => set("seo_title", e.target.value)}
                placeholder="Título para o Google (deixe vazio para usar o título)"
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-amber-300"
              />
              <textarea
                value={d.seo_description || ""}
                onChange={(e) => set("seo_description", e.target.value)}
                placeholder="Descrição para o Google (deixe vazio para usar o resumo)"
                rows={2}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none focus:border-amber-300"
              />
            </div>
          </details>
        )}
      </article>

      {!editing && <ContentAd />}

      {!editing && related.length > 0 && (
        <section className="border-t border-zinc-200 bg-zinc-50">
          <div className="mx-auto w-full max-w-5xl px-4 py-12">
            <h2 className="text-xl font-semibold text-zinc-900">Continue lendo</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"
                >
                  {r.category && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">{r.category}</span>
                  )}
                  <p className="mt-2 font-semibold leading-snug text-zinc-900 group-hover:text-amber-700">{r.title}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3.5 w-3.5" />
                    {r.reading_minutes} min
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Barra fixa de edição (admin) */}
      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              onClick={del}
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
            {msg && <span className="text-sm font-medium text-zinc-500">{msg}</span>}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => save(false)}
                disabled={saving}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Salvar rascunho
              </button>
              <button
                onClick={() => save(true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {d.status === "published" ? "Salvar e publicar" : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
