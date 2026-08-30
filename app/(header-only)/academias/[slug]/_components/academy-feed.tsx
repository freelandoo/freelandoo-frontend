"use client"

// Feed social da academia no MESMO motor do /feed (mig 181): posts/bees dos
// membros vinculados (ou staff) viram itens de portfólio ligados à academia —
// aparecem aqui E no /feed global com a tag "Acessar academia". Espelha o feed
// das comunidades (PortfolioPostCard + CommentsPanel). Publicar NÃO mora
// aqui: é o "+" amarelo do headcard (academy-view), como em toda comunidade.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Loader2, Megaphone } from "lucide-react"
import { getToken } from "@/lib/auth"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"

const PortfolioPostCard = dynamic(
  () => import("@/components/feed/portfolio-post-card").then((m) => m.PortfolioPostCard),
  { ssr: false }
)
const CommentsPanel = dynamic(
  () => import("@/components/comments/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false }
)
const FEED_FILTERS: FeedFilters = { id_machine: null, id_category: null, estado: null, municipio: null, level_min: null }

/** Feed da academia (posts + bees dos membros) — cards padrão do Freelandoo. */
export function AcademyFeed({
  academyId,
  slug,
  reloadKey = 0,
}: {
  academyId: string
  slug: string
  /** Muda quando o "+" do headcard publica algo — força recarregar o mural. */
  reloadKey?: number
  isOwner: boolean
  meId: string | null
}) {
  const t = useTranslations("Academies")

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)

  const fetchPosts = useCallback(
    async (reset: boolean, cur?: string | null) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const sp = new URLSearchParams({ limit: "10" })
        if (!reset && cur) sp.set("cursor", cur)
        const token = getToken()
        const res = await fetch(`/api/academies/${academyId}/feed-posts?${sp.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        })
        const data = await res.json().catch(() => ({}))
        const items: FeedPost[] = Array.isArray(data.items) ? data.items : []
        setPosts((prev) => (reset ? items : [...prev, ...items]))
        setCursor(data.next_cursor || null)
        setHasMore(!!data.has_more)
      } finally {
        if (reset) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [academyId]
  )

  useEffect(() => {
    void fetchPosts(true)
  }, [fetchPosts, reloadKey])

  return (
    <section className="fl-sharp mt-6 border-2 border-[#0B0B0D] bg-[#15120E] p-4 text-[#F5F1E8]">
      <h2 className="flex items-center gap-2 border-b-2 border-[#0B0B0D] pb-2 text-xs font-extrabold uppercase tracking-[0.16em]">
        <Megaphone className="h-4 w-4 text-[#F2B705]" />
        {t("feedTitle", "Mural da academia")}
      </h2>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" />
        </div>
      ) : posts.length === 0 ? (
        <p className="mt-4 text-xs text-[#9A938A]">{t("feedEmpty", "Nenhuma publicação ainda. Seja o primeiro!")}</p>
      ) : (
        <div className="mt-4 overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
          {posts.map((post) => (
            <PortfolioPostCard
              key={post.post_id}
              post={post}
              filters={FEED_FILTERS}
              commentsCount={post.comments_count ?? 0}
              onOpenComments={(pid) => setOpenCommentsFor(pid)}
              onLikeChange={(pid, liked, likes_count) => {
                setPosts((prev) => prev.map((p) => (p.post_id === pid ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count } : p)))
              }}
            />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void fetchPosts(false, cursor)}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("loadMore", "Ver mais")}
          </button>
        </div>
      )}

      {/* Comentários */}
      <CommentsPanel
        postId={openCommentsFor}
        open={!!openCommentsFor}
        onClose={() => setOpenCommentsFor(null)}
        loginNextPath={`/academias/${slug}`}
        onCountChange={(pid, delta) =>
          setPosts((prev) => prev.map((p) => (p.post_id === pid ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 0) + delta) } : p)))
        }
      />
    </section>
  )
}
