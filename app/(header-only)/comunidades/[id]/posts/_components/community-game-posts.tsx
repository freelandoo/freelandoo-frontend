"use client"

/**
 * A VITRINE DOS POSTS DE GAMES — o que o pill ciano do headcard abre.
 *
 * ─── POR QUE É PÁGINA, E NÃO PAINEL ──────────────────────────────────────────
 *
 * Os dois primeiros pills da plataforma de games abrem painéis logo abaixo do
 * headcard porque cabem ali: o jogo atual são três campos. Uma vitrine não é —
 * ela é uma GRADE de capas que cresce com o tempo, e uma grade embaixo do
 * headcard empurraria o feed para longe outra vez, que foi justamente o que os
 * painéis vieram desfazer. Mesma decisão do pill roxo do Ranking.
 *
 * ─── O QUE ELA MOSTRA, E POR QUE É A MESMA FONTE DO FEED ─────────────────────
 *
 * Ela lê `GET /communities/:id/feed-posts`, exatamente a mesma porta que o feed
 * da página usa — o que muda é a FORMA (grade em vez de lista), nunca o
 * conteúdo. Uma segunda consulta "só de games" daria dois lugares decidindo o
 * que é post de games, e no dia em que discordassem a pessoa veria no feed um
 * post que a vitrine jura não existir.
 *
 * Como o espaço de games é UM POR PESSOA e não tem membros, tudo que está aqui
 * dentro é do dono — é isso que faz "os posts de games do usuário" e "os posts
 * desta plataforma" serem a mesma lista, sem filtro de autor nenhum.
 *
 * ─── A RECUSA É DITA EM VOZ ALTA ─────────────────────────────────────────────
 *
 * O pill aparece para quem visita, e visitante de comunidade fechada leva 403
 * na leitura do feed. Grade vazia diria "ninguém postou nada", que é outra
 * coisa — então o 403 vira uma frase, não um vazio.
 */

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { Gamepad2, ImageOff, Loader2, Lock, Play } from "lucide-react"
import { PageBackLink } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
// A vitrine é uma tela DE DENTRO do ambiente: sem o beacon, o dock voltaria ao
// da Freelandoo justamente na página que o próprio dock abre.
import { CommunityShellBeacon } from "@/components/layout/community-shell"
import type { FeedPost } from "@/lib/types/portfolio-feed"
import { accentHex } from "../../_components/community-ui"

// O mesmo fundo da página do ambiente: a vitrine é uma tela DE DENTRO dele, e
// um fundo diferente aqui faria a pessoa achar que saiu da plataforma.
const TechBackdrop = dynamic(
  () => import("@/components/platform/tech-backdrop").then((m) => m.TechBackdrop),
  { ssr: false }
)

type Community = {
  id_profile: string
  display_name: string
  kind?: string | null
  community_theme: { accent?: string } | null
  subject?: { game_title?: string | null } | null
}

export function CommunityGamePosts({ communityId }: { communityId: string }) {
  const t = useTranslations("Community")

  const [community, setCommunity] = useState<Community | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [locked, setLocked] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const fetchPosts = useCallback(
    async (reset: boolean, from?: string | null) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const sp = new URLSearchParams({ limit: "24" })
        if (!reset && from) sp.set("cursor", from)
        const token = getToken()
        const r = await fetch(`/api/communities/${communityId}/feed-posts?${sp.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        })
        // 403 é a comunidade fechada recusando a leitura — não é lista vazia.
        if (r.status === 403) {
          setLocked(true)
          return
        }
        const d = await r.json().catch(() => ({}))
        const items: FeedPost[] = Array.isArray(d.items) ? d.items : []
        setPosts((prev) => (reset ? items : [...prev, ...items]))
        setCursor(d.next_cursor || null)
        setHasMore(!!d.has_more)
      } finally {
        if (reset) setLoading(false)
        else setLoadingMore(false)
      }
    },
    [communityId]
  )

  useEffect(() => {
    let dead = false
    const run = async () => {
      const token = getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      const r = await fetch(`/api/communities/${communityId}`, headers ? { headers } : undefined)
      if (dead) return
      if (r.status === 404) {
        setNotFound(true)
        setLoading(false)
        return
      }
      const d = await r.json().catch(() => ({}))
      setCommunity(d.community || d || null)
      await fetchPosts(true)
    }
    run()
    return () => {
      dead = true
    }
  }, [communityId, fetchPosts])

  const accent = accentHex(community?.community_theme?.accent ?? null)
  const backHref = `/comunidades/${communityId}`
  const inGames = community?.kind === "games"

  if (notFound) {
    return (
      <main className="min-h-screen bg-[#0b0804] px-5 py-10 md:px-10">
        <div className="mx-auto max-w-5xl">
          <PageBackLink href="/account" className="mb-5" />
          <p className="text-sm text-[#9A938A]">{t("notFound", "Comunidade não encontrada.")}</p>
        </div>
      </main>
    )
  }

  return (
    <main className={`relative min-h-screen bg-[#0b0804] px-5 py-8 md:px-10 ${inGames ? "fl-games" : ""}`}>
      {inGames && <TechBackdrop />}
      <div className="relative mx-auto max-w-5xl">
        {inGames && <CommunityShellBeacon communityId={communityId} kind="games" />}
        <PageBackLink href={backHref} className="mb-5" />

        <header
          className="border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-6"
          style={{ boxShadow: `8px 8px 0 0 ${accent}` }}
        >
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
            <Gamepad2 className="h-3.5 w-3.5" style={{ color: accent }} />
            {community?.display_name || "—"}
          </span>
          <h1 className="mt-1 fl-display text-4xl leading-[0.9] text-[#F5F1E8] md:text-6xl">
            {t("gamePostsTitle", "Posts de games")}
          </h1>
          {community?.subject?.game_title && (
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
              {community.subject.game_title}
            </p>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#9A938A]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : locked ? (
          <div className="mt-8 flex items-start gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-6">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
            <p className="text-sm text-[#9A938A]">
              {t("gamePostsLocked", "Esta comunidade é fechada — entre nela para ver os posts.")}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-8 flex items-start gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-6">
            <ImageOff className="mt-0.5 h-5 w-5 shrink-0 text-[#9A938A]" />
            <p className="text-sm text-[#9A938A]">{t("gamePostsEmpty", "Nenhum post de games ainda.")}</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
              {posts.map((p) => (
                <PostTile key={p.post_id} post={p} accent={accent} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchPosts(false, cursor)}
                  className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("gamePostsMore", "Ver mais")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

/**
 * O ladrilho. A moldura é FIXA (4:5) de propósito: numa grade, miniatura é
 * recorte por definição, e soltar a proporção quebraria o alinhamento das
 * colunas — a mesma régua do portfólio e dos Salvos. O recado, que não tem
 * mídia nenhuma, vira ladrilho de texto em vez de buraco na grade.
 */
function PostTile({ post, accent }: { post: FeedPost; accent: string }) {
  const media = post.media?.[0] || null
  const cover = media ? media.thumbnail_url || media.url : null

  return (
    <Link
      href={`/p/${post.post_id}`}
      className="group relative block aspect-[4/5] overflow-hidden border-2 border-[#0B0B0D] bg-[#15120E]"
    >
      {cover ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={post.title || ""}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {media?.type === "video" && (
            <span className="absolute right-2 top-2 border border-[#0B0B0D] bg-[#0b0804]/80 p-1">
              <Play className="h-3 w-3 text-[#F5F1E8]" />
            </span>
          )}
        </>
      ) : (
        <div className="flex h-full w-full items-start p-3">
          <p className="line-clamp-6 text-xs leading-snug text-[#F5F1E8]/85">
            {post.caption || post.title || ""}
          </p>
        </div>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: accent }}
      />
    </Link>
  )
}
