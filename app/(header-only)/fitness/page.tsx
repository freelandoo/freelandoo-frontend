"use client"

// /fitness — A PLATAFORMA FITNESS da Freelandoo inteira: o FEED de todo mundo
// que posta coisas fitness.
//
// ⚠️ É A CÓPIA DA RAIZ DO GAMES (pedido do Alex, 2026-10-09: "transformar a
// comunidade fitness em uma comunidade igual a todas, a primeira tela é o feed
// geral de todo mundo que posta coisas fitness"). A mig 276 garantiu que existe
// UMA plataforma dessas e que ninguém precisa entrar nela; o feed, o composer,
// a curtida, o comentário e a escolha "feed geral × só aqui" são a máquina de
// comunidade que já existe. Um feed próprio aqui seria a segunda máquina para
// a mesma coisa.
//
// ⚠️ O "MEU DIA" (calorias, água, refeições, metas) SAIU DAQUI e mora no topo
// de `/fitness/historico`, atrás do pill turquesa. Não recolocar aqui: a raiz
// é a parte PÚBLICA da plataforma; o que é da pessoa mora atrás da foto.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, Loader2 } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { PublishMenuButton, type PublishItem } from "@/components/composer/publish-menu-button"
import { FitnessShell } from "./_components/fitness-shell"
import { FitnessHeadcard } from "./_components/fitness-headcard"
import { FitnessProposalsGate } from "./_components/proposals-modal"
import { EMBER, StateBox } from "./_components/fitness-ui"

// Pesados e só necessários depois de um gesto — mesma disciplina do Games.
const PortfolioPostCard = dynamic(
  () => import("@/components/feed/portfolio-post-card").then((m) => m.PortfolioPostCard),
  { ssr: false }
)
const CommentsPanel = dynamic(
  () => import("@/components/comments/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false }
)
const MediaComposer = dynamic(
  () => import("@/components/composer/MediaComposer").then((m) => m.MediaComposer),
  { ssr: false }
)
const RecadoComposer = dynamic(
  () => import("@/components/composer/RecadoComposer").then((m) => m.RecadoComposer),
  { ssr: false }
)

/** O card pede os filtros da vitrine; aqui o recorte já é a plataforma. */
const FEED_FILTERS: FeedFilters = {
  id_machine: null,
  id_category: null,
  estado: null,
  municipio: null,
  level_min: null,
}

type Platform = { id_profile: string; display_name: string | null; bio: string | null }

const noop = () => {}

export default function FitnessFeedPage() {
  const tr = useTranslations("Fitness")
  const { perfil } = useMeProfile()

  const [platform, setPlatform] = useState<Platform | null>(null)
  const [loadingPlatform, setLoadingPlatform] = useState(true)
  const [error, setError] = useState("")

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [composerOpen, setComposerOpen] = useState(false)
  const [composerKind, setComposerKind] = useState<"post" | "bee" | "story">("post")
  const [recadoOpen, setRecadoOpen] = useState(false)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)

  // ⚠️ ESTÁVEIS POR EXIGÊNCIA DO `memo` do `PortfolioPostCard`: arrow inline no
  // JSX nasce nova a cada render e derruba a comparação da lista inteira.
  const openPostComments = useCallback((pid: string) => setOpenCommentsFor(pid), [])

  const handleLikeChange = useCallback((pid: string, liked: boolean, likes_count: number | null) => {
    setPosts((prev) =>
      prev.map((p) => (p.post_id === pid ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count } : p))
    )
  }, [])

  /** Qual é a plataforma. Uma chamada, uma vez — o id não muda (mig 276). */
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    fetch("/api/fitness/platform", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok || !d?.platform?.id_profile) {
          throw new Error(d?.error || tr("feedLoadError", "Não deu pra abrir o feed do Fitness."))
        }
        setPlatform(d.platform)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoadingPlatform(false))
    return () => {
      cancelled = true
    }
  }, [tr])

  /** O feed é o `feed-posts` DA COMUNIDADE — a mesma porta do Games e do Financeiro. */
  const fetchPosts = useCallback(
    async (reset: boolean, next?: string | null) => {
      if (!platform?.id_profile) return
      if (reset) setLoadingPosts(true)
      else setLoadingMore(true)
      try {
        const sp = new URLSearchParams({ limit: "10" })
        if (!reset && next) sp.set("cursor", next)
        const token = getToken()
        const r = await fetch(`/api/communities/${platform.id_profile}/feed-posts?${sp.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
        })
        const d = await r.json().catch(() => ({}))
        const items: FeedPost[] = Array.isArray(d.items) ? d.items : []
        setPosts((prev) => (reset ? items : [...prev, ...items]))
        setCursor(d.next_cursor || null)
        setHasMore(!!d.has_more)
      } finally {
        if (reset) setLoadingPosts(false)
        else setLoadingMore(false)
      }
    },
    [platform?.id_profile]
  )

  useEffect(() => {
    void fetchPosts(true)
  }, [fetchPosts])

  const publishItems: PublishItem[] = [
    { kind: "post", label: tr("postLabel", "Post") },
    { kind: "bee", label: tr("curtoLabel", "Curto") },
    { kind: "story", label: tr("beeLabel", "Bee") },
    { kind: "recado", label: tr("recadoLabel", "Recado") },
  ]

  const onPick = (kind: string) => {
    if (kind === "recado") {
      setRecadoOpen(true)
      return
    }
    setComposerKind(kind as "post" | "bee" | "story")
    setComposerOpen(true)
  }

  const publishText = tr("publishCta", "Publicar no Fitness")
  const composeLabel = tr("composeCta", "Publicar")

  return (
    <FitnessShell>
      {/* Propostas pendentes do professor: a raiz é a porta de entrada, então
          o modal precisa aparecer aqui também (e não só no Histórico). */}
      <FitnessProposalsGate onApplied={noop} />

      <FitnessHeadcard
        perfil={perfil}
        title={tr("platformTitle", "Fitness")}
        backHref="/account"
        action={
          <PublishMenuButton accent={EMBER} label={composeLabel} items={publishItems} onPick={onPick} />
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        {loadingPlatform || (loadingPosts && !error) ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse border-2 border-[#F5F1E8]/10 bg-[#1D1810]" />
            ))}
          </div>
        ) : error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={tr("loadFailedTitle", "Não deu pra carregar.")}
            desc={error}
            accent={EMBER}
          />
        ) : posts.length === 0 ? (
          // Feed vazio: o botão GRANDE ocupa o lugar do aviso.
          <PublishMenuButton
            variant="block"
            text={publishText}
            accent={EMBER}
            label={composeLabel}
            items={publishItems}
            onPick={onPick}
          />
        ) : (
          <div className="space-y-3">
            {/* Com publicações, a mesma porta vira faixa fina: quem chega aqui
                veio ler, e o convite não pode competir com o conteúdo. */}
            <PublishMenuButton
              variant="bar"
              text={publishText}
              accent={EMBER}
              label={composeLabel}
              items={publishItems}
              onPick={onPick}
            />
            <div className="overflow-hidden border-2 border-[#0B0B0D] bg-[#141312]">
              {posts.map((post) => (
                <PortfolioPostCard
                  key={post.post_id}
                  post={post}
                  filters={FEED_FILTERS}
                  commentsCount={post.comments_count ?? 0}
                  hideCommunityLink
                  onOpenComments={openPostComments}
                  onLikeChange={handleLikeChange}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchPosts(false, cursor)}
                  className="inline-flex items-center gap-2 border-2 border-[#F5F1E8]/25 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] transition hover:border-[#F5F1E8] disabled:opacity-60"
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {tr("loadMore", "Carregar mais")}
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <CommentsPanel
        postId={openCommentsFor}
        open={!!openCommentsFor}
        onClose={() => setOpenCommentsFor(null)}
        loginNextPath="/fitness"
        onCountChange={(pid, delta) =>
          setPosts((prev) =>
            prev.map((p) =>
              p.post_id === pid ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 0) + delta) } : p
            )
          )
        }
      />

      {composerOpen && platform && (
        <MediaComposer
          open
          mode={composerKind}
          communityId={platform.id_profile}
          communityName={platform.display_name || tr("platformTitle", "Fitness")}
          // NÃO é exclusivo por padrão: a plataforma é pública, e a regra da
          // casa é publicar nos DOIS (aqui e no feed geral).
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false)
            void fetchPosts(true)
          }}
        />
      )}

      {recadoOpen && platform && (
        <RecadoComposer
          open
          communityId={platform.id_profile}
          onClose={() => setRecadoOpen(false)}
          onPosted={() => {
            setRecadoOpen(false)
            void fetchPosts(true)
          }}
        />
      )}
    </FitnessShell>
  )
}
