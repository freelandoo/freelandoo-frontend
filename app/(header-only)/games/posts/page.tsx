"use client"

// /games/posts — A VITRINE DOS POSTS DE GAMES: a grade do que UMA pessoa
// publicou dentro da plataforma.
//
// Lê `GET /communities/:id/feed-posts` — exatamente a MESMA porta que o feed
// da raiz usa — com o recorte de autor. O que muda é a FORMA (grade em vez de
// lista), nunca o conteúdo: uma segunda consulta "só de games" daria dois
// lugares decidindo o que é post de games.
//
// ⚠️ SÃO DOIS REGIMES, E A DIFERENÇA É DE SEGURANÇA. Sem contexto o recorte é
// `author=me`, que o backend lê do TOKEN. Com `?de=@fulano` ele é o id_user
// dele — e o backend só aceita um id explícito quando a comunidade é
// PLATAFORMA, onde ninguém entra e o feed já é público.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ImageOff, Loader2, Play } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { FeedPost } from "@/lib/types/portfolio-feed"
import { GamesShell } from "../_components/games-shell"
import { GamesHeadcard } from "../_components/games-headcard"
import { PURPLE_GLOW } from "../_components/games-ui"
import { ownerLabel, useGamesContext, withOwner } from "../_components/games-context"

export default function GamesPostsPage() {
  const tr = useTranslations("Games")
  const { perfil } = useMeProfile()
  const { owner } = useGamesContext()

  const [platformId, setPlatformId] = useState<string | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")

  /** Qual é a plataforma (o id da comunidade que guarda o feed). */
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    let alive = true
    fetch("/api/games/platform", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (!alive) return
        if (!r.ok || !d?.community?.id_profile) throw new Error(d?.error || tr("loadError", "Não deu pra abrir o Games."))
        setPlatformId(d.community.id_profile)
      })
      .catch((e) => {
        if (!alive) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tr])

  const fetchPosts = useCallback(
    async (reset: boolean, from?: string | null) => {
      if (!platformId || owner === undefined) return
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        const sp = new URLSearchParams({ limit: "24", author: owner ? owner.id_user : "me" })
        if (!reset && from) sp.set("cursor", from)
        const token = getToken()
        const r = await fetch(`/api/communities/${platformId}/feed-posts?${sp.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        })
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
    [platformId, owner]
  )

  // ESPERA o contexto resolver: sem isso a grade buscaria os posts de quem olha
  // e os trocaria por baixo quando o `?de=` chegasse.
  useEffect(() => {
    void fetchPosts(true)
  }, [fetchPosts])

  const visiting = !!owner

  return (
    <GamesShell>
      <GamesHeadcard
        perfil={perfil}
        title={visiting && owner ? tr("postsTitleOf", "Posts de {who}").replace("{who}", ownerLabel(owner)) : tr("postsTitle", "Posts de games")}
        backHref={withOwner("/games", owner)}
        active="posts"
        owner={owner}
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-5 md:px-10">
        {loading || owner === undefined ? (
          <div className="flex items-center justify-center py-20 text-[#9A938A]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-6">
            <ImageOff className="mt-0.5 h-5 w-5 shrink-0 text-[#9A938A]" />
            <p className="text-sm text-[#9A938A]">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex items-start gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-6">
            <ImageOff className="mt-0.5 h-5 w-5 shrink-0 text-[#9A938A]" />
            {/* DOIS vazios: a vitrine de outra pessoa fala DELA — dizer "você
                não publicou" ali seria falar do visitante numa tela que não é
                sobre ele. */}
            <p className="text-sm text-[#9A938A]">
              {owner
                ? tr("postsEmptyOther", "{who} ainda não publicou nada aqui.").replace("{who}", ownerLabel(owner))
                : tr("postsEmptyMine", "Você ainda não publicou nada no Games.")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
              {posts.map((p) => (
                <PostTile key={p.post_id} post={p} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchPosts(false, cursor)}
                  className="inline-flex items-center gap-2 border-2 border-[#F5F1E8]/25 px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] transition hover:border-[#F5F1E8] disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {tr("loadMore", "Carregar mais")}
                </button>
              </div>
            )}
          </>
        )}

        {visiting && (
          <div className="mt-5">
            <Link href="/games/posts" className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A] transition hover:text-[#F5F1E8]">
              {tr("seeMine", "Ver o meu games")} →
            </Link>
          </div>
        )}
      </section>
    </GamesShell>
  )
}

/**
 * O ladrilho. A moldura é FIXA (4:5) de propósito: numa grade, miniatura é
 * recorte por definição — a mesma régua do portfólio e dos Salvos. O recado,
 * sem mídia, vira ladrilho de texto em vez de buraco na grade.
 */
function PostTile({ post }: { post: FeedPost }) {
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
          <p className="line-clamp-6 text-xs leading-snug text-[#F5F1E8]/85">{post.caption || post.title || ""}</p>
        </div>
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: PURPLE_GLOW }}
      />
    </Link>
  )
}
