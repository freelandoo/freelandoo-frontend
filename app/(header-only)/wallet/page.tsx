"use client"

// /wallet — O FINANCEIRO: a plataforma financeira da Freelandoo inteira.
//
// ⚠️ NÃO É UMA COMUNIDADE, e a tela passou a dizer isso (pedido do Alex,
// 2026-09-08): "o financeiro não é uma comunidade, não tem membros, não precisa
// entrar, é como games (...) são como se fossem plataformas, têm o mesmo
// comportamento". Ela era uma folha de papel com um H2 chamado "O mural do
// dinheiro"; virou a MESMA silhueta da plataforma de games — banner, foto com
// os pills escapando por trás, título gigante, o "+" no canto e as abas.
//
// ⚠️ E NÃO É MAIS "MURAL": é FEED. O mural é o quadro de recados de um grupo,
// que tem dono e tem quem entre. Aqui não há nem uma coisa nem outra.
//
// ⚠️ DUAS ABAS — FEED e MERCADO —, exatamente como games tem Feed e Estante. O
// Mercado deixou de ser um pill atrás da foto (e a rota `/wallet/mercado` foi
// apagada): ele é CONTEÚDO da plataforma, e conteúdo mora nas abas. Um pill e
// uma aba para a mesma tela seriam duas portas, e é assim que uma delas para de
// acompanhar a outra.
//
// ⚠️ O FEED É O DA MÁQUINA DE COMUNIDADE (mig 160/229), e é por isso que esta
// página é curta: composer, curtida, comentário, denúncia, XP e a escolha "feed
// geral × só aqui" já existem. O que a mig 229 fez foi garantir que existe UMA
// plataforma dessas e que ninguém precisa entrar nela. Um feed próprio aqui
// seria a segunda máquina para a mesma coisa.
//
// ⚠️ NINGUÉM ENTRA E NINGUÉM É DONO: não há botão de Entrar, nem membros, nem
// mural do líder, nem edição de nome/foto. Todo usuário logado lê e publica.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { AlertCircle, BarChart3, Loader2, Newspaper } from "lucide-react"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { PublishMenuButton, type PublishItem } from "@/components/composer/publish-menu-button"
import { FinanceShell } from "./_components/finance-shell"
import { WalletHeadcard } from "./_components/wallet-headcard"
import { MarketPanel } from "./_components/market-panel"
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
type FinanceTab = "feed" | "market"

export default function FinancePage() {
  const tr = useTranslations("Wallet")
  const { perfil } = useMeProfile()

  const [tab, setTab] = useState<FinanceTab>("feed")
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
  // JSX nasce nova a cada render e derruba a comparação, fazendo a lista
  // inteira de posts re-renderizar a cada estado desta tela.
  const openPostComments = useCallback((pid: string) => setOpenCommentsFor(pid), [])

  const handleLikeChange = useCallback((pid: string, liked: boolean, likes_count: number | null) => {
    setPosts((prev) =>
      prev.map((p) => (p.post_id === pid ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count } : p))
    )
  }, [])

  /**
   * Deep-link da aba (`?aba=mercado`), lido do WINDOW e UMA VEZ.
   *
   * ⚠️ `useSearchParams` obriga Suspense e tira a rota do pré-render — o build
   * já quebrou assim com `?tipo=condo`. E a leitura é uma só porque é ela que
   * decide a aba INICIAL: relendo a cada render, trocar de aba com a URL ainda
   * dizendo `?aba=mercado` devolveria a pessoa para o Mercado sozinho.
   */
  useEffect(() => {
    const aba = new URLSearchParams(window.location.search).get("aba")
    if (aba === "mercado") setTab("market")
  }, [])

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

  const tabs: [FinanceTab, string][] = [
    ["feed", tr("tabFeed", "Feed")],
    ["market", tr("tabMarket", "Mercado")],
  ]

  return (
    <FinanceShell>
      <WalletHeadcard
        perfil={perfil}
        title={tr("financePlatformTitle", "Financeiro")}
        backHref="/account"
        action={
          <PublishMenuButton
            accent={GREEN}
            label={tr("composeCta", "Publicar")}
            items={publishItems}
            onPick={onPick}
          />
        }
      />

      <section className="mx-auto mt-8 w-full max-w-5xl px-0 md:px-10">
        <div className="flex gap-1 border-b-2 border-[#F5F1E8]/15">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="-mb-0.5 flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]"
              style={{
                borderBottom: tab === key ? `4px solid ${GREEN}` : "4px solid transparent",
                opacity: tab === key ? 1 : 0.5,
              }}
            >
              {key === "market" ? <BarChart3 className="h-3.5 w-3.5" /> : <Newspaper className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "market" ? (
            // O MERCADO — manchetes, cotações e ações em alta. Mesma peça que
            // servia a rota apagada: ela mudou de casa, não de fonte.
            <MarketPanel />
          ) : loadingPlatform || loadingPosts ? (
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
        </div>
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
          communityName={platform.display_name || tr("financePlatformTitle", "Financeiro")}
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
    </FinanceShell>
  )
}
