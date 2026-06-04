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
    <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Modo administrador</p>
          <p className="text-xs text-zinc-600">Crie um post ou abra qualquer um para editar direto na página.</p>
        </div>
        <button
          onClick={createPost}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Novo post
        </button>
      </div>
      {drafts.length > 0 && (
        <div className="mt-3 border-t border-amber-200 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-700">Rascunhos</p>
          <div className="flex flex-wrap gap-2">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/blog/${d.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-amber-400"
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
