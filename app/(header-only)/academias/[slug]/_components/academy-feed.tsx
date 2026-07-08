"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ImageIcon, Loader2, Megaphone, Send, Share2, Trash2, X } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"

type Post = {
  id_post: string
  id_user: string
  author: string | null
  caption: string | null
  media_url: string | null
  thumbnail_url: string | null
  media_kind: "image" | "video" | null
  share_count: number
  created_at: string
}

/** Feed social da academia: posts de texto/imagem/vídeo dos membros. */
export function AcademyFeed({
  academyId,
  slug,
  canPost,
  isOwner,
  meId,
}: {
  academyId: string
  slug: string
  canPost: boolean
  isOwner: boolean
  meId: string | null
}) {
  const t = useTranslations("Academies")
  const locale = useLocale()

  const [posts, setPosts] = useState<Post[]>([])
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading")
  const [caption, setCaption] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const authHeaders = useCallback((): Record<string, string> => {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/academies/${academyId}/posts`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPosts(Array.isArray(data.posts) ? data.posts : [])
      setState("loaded")
    } catch {
      setState("error")
    }
  }, [academyId])

  useEffect(() => {
    void load()
  }, [load])

  const publish = useCallback(async () => {
    if (!caption.trim() && !file) {
      toast.error(t("postMissing", "Escreva algo ou anexe uma mídia."))
      return
    }
    setPosting(true)
    try {
      const fd = new FormData()
      if (caption.trim()) fd.set("caption", caption.trim())
      if (file) fd.set("media", file)
      const res = await fetch(`/api/academies/${academyId}/posts`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(t("postOk", "Publicado!"))
      setCaption("")
      setFile(null)
      if (fileRef.current) fileRef.current.value = ""
      void load()
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : t("postError", "Erro ao publicar"))
    } finally {
      setPosting(false)
    }
  }, [caption, file, academyId, authHeaders, load, t])

  const remove = useCallback(
    async (post: Post) => {
      if (!window.confirm(t("postDeleteConfirm", "Excluir esta publicação?"))) return
      try {
        const res = await fetch(`/api/academies/${academyId}/posts/${post.id_post}`, {
          method: "DELETE",
          headers: authHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        void load()
      } catch (err) {
        toast.error(err instanceof Error && err.message ? err.message : t("postError", "Erro ao publicar"))
      }
    },
    [academyId, authHeaders, load, t]
  )

  const share = useCallback(
    async (post: Post) => {
      const url = `${window.location.origin}/academias/${slug}`
      try {
        if (navigator.share) {
          await navigator.share({ url, text: post.caption || undefined })
        } else {
          await navigator.clipboard.writeText(url)
          toast.success(t("shareCopied", "Link copiado!"))
        }
        await fetch(`/api/academies/${academyId}/posts/${post.id_post}/share`, {
          method: "POST",
          headers: authHeaders(),
        })
        void load()
      } catch {
        /* share cancelado pelo usuário */
      }
    },
    [academyId, slug, authHeaders, load, t]
  )

  return (
    <section className="mt-6 border-2 border-[#0B0B0D] bg-[#15120E] p-4 text-[#F5F1E8]">
      <h2 className="flex items-center gap-2 border-b-2 border-[#0B0B0D] pb-2 text-xs font-extrabold uppercase tracking-[0.16em]">
        <Megaphone className="h-4 w-4 text-[#F2B705]" />
        {t("feedTitle", "Mural da academia")}
      </h2>

      {/* Composer (membros) */}
      {canPost && (
        <div className="mt-3 border-2 border-[#0B0B0D] bg-[#1D1810] p-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            placeholder={t("composerPh", "Compartilhe com a galera da academia...")}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#9A938A]"
          />
          <div className="mt-2 flex items-center justify-between border-t border-[#F5F1E8]/10 pt-2">
            <div className="flex items-center gap-2">
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 border-2 border-[#0B0B0D] bg-[#15120E] px-2 py-1 text-[11px] font-extrabold uppercase text-[#F5F1E8] hover:bg-[#241d12]">
                <ImageIcon className="h-3.5 w-3.5" />
                {t("composerMedia", "Foto/vídeo")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <span className="flex items-center gap-1 text-[11px] text-[#9A938A]">
                  {file.name.slice(0, 24)}
                  <button
                    onClick={() => {
                      setFile(null)
                      if (fileRef.current) fileRef.current.value = ""
                    }}
                    aria-label={t("composerRemoveMedia", "Remover mídia")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => void publish()}
              disabled={posting}
              className="flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase text-[#0B0B0D] disabled:opacity-50"
            >
              {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t("composerSubmit", "Publicar")}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {state === "loading" && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#9A938A]" />
        </div>
      )}
      {state === "error" && <p className="mt-3 text-xs text-[#9A938A]">{t("feedError", "Erro ao carregar o mural.")}</p>}
      {state === "loaded" && posts.length === 0 && (
        <p className="mt-3 text-xs text-[#9A938A]">{t("feedEmpty", "Nenhuma publicação ainda. Seja o primeiro!")}</p>
      )}
      <ul className="mt-3 space-y-4">
        {posts.map((p) => (
          <li key={p.id_post} className="border-2 border-[#0B0B0D] bg-[#1D1810]">
            <div className="flex items-center justify-between border-b border-[#F5F1E8]/10 px-3 py-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#F2B705]">{p.author || t("postAnon", "Membro")}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#9A938A]">{new Date(p.created_at).toLocaleDateString(locale)}</span>
                {(isOwner || (meId && p.id_user === meId)) && (
                  <button onClick={() => void remove(p)} aria-label={t("postDelete", "Excluir")}>
                    <Trash2 className="h-3.5 w-3.5 text-[#9A938A] hover:text-[#ff5a44]" />
                  </button>
                )}
              </div>
            </div>
            {p.caption && <p className="whitespace-pre-wrap px-3 py-2 text-sm">{p.caption}</p>}
            {p.media_url && p.media_kind === "image" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.media_url} alt="" loading="lazy" className="max-h-[480px] w-full object-cover" />
            )}
            {p.media_url && p.media_kind === "video" && (
              <video src={p.media_url} poster={p.thumbnail_url || undefined} controls preload="none" className="max-h-[480px] w-full" />
            )}
            <div className="flex items-center justify-end border-t border-[#F5F1E8]/10 px-3 py-1.5">
              <button onClick={() => void share(p)} className="flex items-center gap-1 text-[11px] font-bold uppercase text-[#9A938A] hover:text-[#F2B705]">
                <Share2 className="h-3.5 w-3.5" />
                {t("postShare", "Compartilhar")}
                {p.share_count > 0 && <span>({p.share_count})</span>}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
