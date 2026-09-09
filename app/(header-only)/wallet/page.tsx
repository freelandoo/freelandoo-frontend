"use client"

// /wallet — O FINANCEIRO: a plataforma financeira da Freelandoo inteira.
//
// Pedido do Alex (2026-09-08): a raiz da Carteira "vai virar uma comunidade
// financeira (...) tudo que todo mundo postar que for financeiro vai entrar aí
// (...) todos os usuários vão ter acesso quando entrar ali na carteira" — e,
// perguntado se era comunidade ou mural: "é estilo o games lá (...) não precisa
// ninguém entrar, vira uma plataforma independente, com contagem própria de
// pontos, ranking, igualmente o games mas para o mundo financeiro".
//
// ⚠️ O DINHEIRO DA PESSOA SAIU DAQUI e virou a página do pill verde
// (/wallet/carteira): Vida Financeira, escopo, KPIs, MEI, gráfico e extrato.
// Esta tela é do MUNDO, não da conta — foi o que o novo par eyebrow/título
// passou a dizer ("o seu mundo" / "Financeiro").
//
// ⚠️ ELE É UMA COMUNIDADE, e é por isso que esta página é curta: o feed, o
// composer, curtida, comentário, denúncia e a escolha "feed geral × só aqui"
// são a máquina de comunidade que já existe (mig 160). O que o backend fez de
// novo (mig 229) foi garantir que existe UMA plataforma dessas e que ninguém
// precisa entrar nela. Escrever um feed próprio aqui seria a segunda máquina
// para a mesma coisa.
//
// ⚠️ NINGUÉM ENTRA E NINGUÉM É DONO: não há botão de Entrar, nem membros, nem
// mural do líder, nem edição de nome/foto. Todo usuário logado lê e publica.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, Loader2, Wallet } from "lucide-react"
import { Halftone, Underline } from "@/components/home/landing/primitives"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { PublishMenuButton, type PublishItem } from "@/components/composer/publish-menu-button"
import { WalletHeadcard } from "./_components/wallet-headcard"
import { GREEN, StateBox } from "./_components/wallet-ui"

// Pesados e só necessários depois de um gesto — mesma disciplina da página da
// comunidade, que carrega os três por `dynamic`.
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

/**
 * O card do feed pede os filtros da vitrine para montar os links de
 * "mais como este". Aqui não há filtro nenhum a aplicar — o recorte já é a
 * plataforma —, então vão todos nulos, como faz a página da comunidade.
 */
const FEED_FILTERS: FeedFilters = {
  id_machine: null,
  id_category: null,
  estado: null,
  municipio: null,
  level_min: null,
}

type Platform = { id_profile: string; display_name: string | null; bio: string | null }

export default function FinancePage() {
  const tr = useTranslations("Wallet")
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

  /** Qual é a plataforma. Uma chamada, uma vez — o id não muda. */
  useEffect(() => {
    const token = getToken()
    if (!token) return
    let cancelled = false
    fetch("/api/finance", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => null)
        if (cancelled) return
        if (!r.ok || !d?.platform?.id_profile) {
          throw new Error(d?.error || tr("financeLoadError", "Não deu pra abrir o Financeiro."))
        }
        setPlatform(d.platform)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoadingPlatform(false))
    return () => {
      cancelled = true
    }
  }, [tr])

  /**
   * O feed é o `feed-posts` DA COMUNIDADE — a mesma porta da página de
   * comunidade. Uma consulta "só de posts financeiros" daria dois lugares
   * decidindo o que é post financeiro, e no dia em que discordassem a pessoa
   * veria aqui um post que a outra tela jura não existir.
   */
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
    <main className="fl-root fl-paper-texture relative min-h-[100dvh] overflow-x-clip pb-24">
      <Halftone className="absolute left-3 top-40 h-24 w-24 opacity-[0.1]" />

      <WalletHeadcard
        perfil={perfil}
        eyebrow={tr("financeEyebrow", "o seu mundo")}
        title={tr("financeTitle", "Financeiro")}
        backHref="/account"
      />

      <section className="mx-auto mt-6 w-full max-w-6xl px-3 md:px-8">
        <div className="relative mb-5 inline-block">
          <h2 className="flex items-center gap-2 fl-display text-3xl text-[#F1EDE2] md:text-4xl">
            <Wallet className="h-6 w-6" /> {tr("financeWallTitle", "O mural do dinheiro")}
          </h2>
          <Underline className="absolute -bottom-2 left-0 h-3.5 w-32" style={{ color: GREEN }} />
        </div>
        <p className="mb-6 max-w-2xl text-[12px] leading-relaxed text-[#C9C2B6]/80">
          {tr(
            "financeIntro",
            "Aqui é de todo mundo: ninguém entra, todo mundo publica. O que você postar sobre dinheiro aparece nesta parede e, se você quiser, também no feed geral."
          )}
        </p>

        {loadingPlatform || loadingPosts ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse border-2 border-[#F1EDE2]/10 bg-[#1D1810]" />
            ))}
          </div>
        ) : error ? (
          <StateBox
            icon={<AlertCircle className="h-6 w-6" />}
            title={tr("loadFailedTitle", "Não deu pra carregar.")}
            desc={error}
          />
        ) : posts.length === 0 ? (
          // Feed vazio: o botão GRANDE ocupa o lugar do aviso, em vez de ficar
          // ao lado dele — a caixa de "ainda não há publicações" dizia que
          // faltava alguma coisa sem dar o que fazer. Mesma escolha da página
          // da comunidade.
          <PublishMenuButton
            variant="block"
            text={tr("publishFinanceCta", "Publicar no Financeiro")}
            accent={GREEN}
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
              text={tr("publishFinanceCta", "Publicar no Financeiro")}
              accent={GREEN}
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
                  onOpenComments={(pid) => setOpenCommentsFor(pid)}
                  onLikeChange={(pid, liked, likes_count) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.post_id === pid
                          ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count }
                          : p
                      )
                    )
                  }}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => fetchPosts(false, cursor)}
                  className="inline-flex items-center gap-2 border-2 border-[#F1EDE2]/25 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F1EDE2] transition hover:border-[#F1EDE2] disabled:opacity-60"
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
        loginNextPath="/wallet"
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
          communityName={platform.display_name || tr("financeTitle", "Financeiro")}
          // NÃO é exclusivo por padrão: o Financeiro é público, e a regra da
          // casa é publicar nos DOIS (aqui e no feed geral) deixando o autor
          // guardar só aqui se quiser. Foi a escolha do Alex quando perguntado.
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
    </main>
  )
}
