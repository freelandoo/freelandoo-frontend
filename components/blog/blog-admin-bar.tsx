"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Plus, Pencil } from "lucide-react"

interface DraftItem {
  id: string
  slug: string
  title: string
}

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

export function BlogAdminBar() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [creating, setCreating] = useState(false)

  const loadDrafts = useCallback(async () => {
    const t = getToken()
    if (!t) return
    try {
      const res = await fetch("/api/admin/blog/posts?status=draft", {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      })
      const data = await res.json()
      if (res.ok) setDrafts((data.posts || []).map((p: DraftItem) => ({ id: p.id, slug: p.slug, title: p.title })))
    } catch {
      /* silencioso */
    }
  }, [])

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
        if (admin) void loadDrafts()
      })
      .catch(() => {})
  }, [loadDrafts])

  async function createPost() {
    const t = getToken()
    if (!t) return
    setCreating(true)
    try {
      const fd = new FormData()
      fd.append("title", "Novo post")
      fd.append("status", "draft")
      const res = await fetch("/api/admin/blog/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: fd,
      })
      const data = await res.json()
      if (res.ok && data?.post?.slug) {
        router.push(`/blog/${data.post.slug}`)
      }
    } finally {
      setCreating(false)
    }
  }

  if (!isAdmin) return null

  return (
    <div className="mb-8 border-2 border-[var(--ink)] bg-[var(--paper)] p-4 shadow-[5px_5px_0_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="casa-body text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--magenta-deep)]">Modo administrador</p>
          <p className="casa-body text-sm text-[var(--ink-soft)]/80">Crie um post ou abra qualquer um para editar direto na página.</p>
        </div>
        <button
          onClick={createPost}
          disabled={creating}
          className="inline-flex items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--paper)] hover:opacity-90 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo post
        </button>
      </div>
      {drafts.length > 0 && (
        <div className="mt-3 border-t-2 border-[var(--ink)]/15 pt-3">
          <p className="mb-2 casa-body text-[11px] font-extrabold uppercase tracking-wide text-[var(--ink-soft)]/60">Rascunhos</p>
          <div className="flex flex-wrap gap-2">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/blog/${d.slug}`}
                className="inline-flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-1.5 casa-body text-xs font-bold text-[var(--ink)] hover:bg-[var(--paper-2)]"
              >
                <Pencil className="h-3.5 w-3.5" />
                {d.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
