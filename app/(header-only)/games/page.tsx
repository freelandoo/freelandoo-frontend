"use client"

// /games — A PLATAFORMA DE GAMES da Freelandoo inteira.
//
// ⚠️ NÃO É UMA COMUNIDADE, E NÃO PASSA PELA PÁGINA DE COMUNIDADE (pedido do
// Alex, 2026-09-10: "eu pedi para demolir tudo e agora pedi para criar igual o
// financeiro, não uma comunidade, mas uma plataforma, nos moldes do
// financeiro"). O games anterior ERA a página de comunidade — um componente de
// ~2.700 linhas com o feed inteiro desenhado de uma vez —, e era ela, por
// baixo dos pills, que fazia o hover atrasar e a animação cair a 5 fps. Esta
// página é a cópia da raiz do Financeiro (`wallet/page.tsx`): ~300 linhas,
// nada da comunidade.
//
// ⚠️ O FEED É O DA MÁQUINA DE COMUNIDADE (migs 160/232): composer, curtida,
// comentário, denúncia, XP e a escolha "feed geral × só aqui" já existem. A
// mig 232 garantiu que existe UMA plataforma dessas e que ninguém precisa
// entrar nela. Um feed próprio aqui seria a segunda máquina para a mesma coisa.
//
// ⚠️ NINGUÉM ENTRA E NINGUÉM É DONO: não há Entrar, membros, mural do líder nem
// edição de nome/foto. Todo usuário logado lê e publica.
//
// ⚠️ A RAIZ É SÓ O FEED. A Estante foi aba daqui (slice G4) e virou sala
// própria em `/games/estante`, atrás do pill amarelo (2026-09-10): conteúdo
// pessoal mora atrás da foto, como Posts e Jogo atual. Não recriar a barra de
// abas — com uma opção só ela pediria um clique que não decide nada.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, Loader2 } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { PublishMenuButton, type PublishItem } from "@/components/composer/publish-menu-button"
import { GamesShell } from "./_components/games-shell"
import { GamesHeadcard } from "./_components/games-headcard"
import { PURPLE, StateBox } from "./_components/games-ui"
import { useGamesContext } from "./_components/games-context"

// Pesados e só necessários depois de um gesto — mesma disciplina do Financeiro.
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

export default function GamesPage() {
  const tr = useTranslations("Games")
  const { perfil } = useMeProfile()
  // O contexto (`?de=@fulano`) não muda nada NESTA tela (o feed é de todos);
  // ele só é lido para os pills pessoais do headcard o preservarem ao navegar.
  const { owner } = useGamesContext()

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

  /** Qual é a plataforma. Uma chamada, uma vez — o id não muda (mig 232). */
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    fetch("/api/games/platform", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok || !d?.community?.id_profile) {
          throw new Error(d?.error || tr("loadError", "Não deu pra abrir o Games."))
        }
        setPlatform(d.community)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoadingPlatform(false))
    return () => {
      cancelled = true
    }
  }, [tr])

  /** O feed é o `feed-posts` DA COMUNIDADE — a mesma porta que o Financeiro usa. */
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

  return (
    <GamesShell>
      <GamesHeadcard
        perfil={perfil}
        title={tr("platformTitle", "Games")}
        backHref="/account"
        owner={owner}
        action={
          <PublishMenuButton
            accent={PURPLE}
            label={tr("composeCta", "Publicar")}
            items={publishItems}
            onPick={onPick}
          />
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        {loadingPlatform || loadingPosts ? (
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
            accent={PURPLE}
          />
        ) : posts.length === 0 ? (
          // Feed vazio: o botão GRANDE ocupa o lugar do aviso — a caixa de
          // "ainda não há publicações" dizia que faltava algo sem dar o que fazer.
          <PublishMenuButton
            variant="block"
            text={tr("publishCta", "Publicar no Games")}
            accent={PURPLE}
            label={tr("composeCta", "Publicar")}
            items={publishItems}
            onPick={onPick}
          />
        ) : (
          <div className="space-y-3">
            {/* Com publicações, a mesma porta vira faixa fina: quem chega aqui
                veio ler, e o convite não pode competir com o conteúdo. */}
            <PublishMenuButton
              variant="bar"
              text={tr("publishCta", "Publicar no Games")}
              accent={PURPLE}
              label={tr("composeCta", "Publicar")}
              items={publishItems}
              onPick={onPick}
            />
            <div className="overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
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
        loginNextPath="/games"
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
          communityName={platform.display_name || tr("platformTitle", "Games")}
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
    </GamesShell>
  )
}
