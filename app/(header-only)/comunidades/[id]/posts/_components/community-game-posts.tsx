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
 * ⚠️ O QUE MUDA NA PLATAFORMA (mig 232) É O RECORTE, e não a fonte. Games
 * deixou de ser o espaço de uma pessoa: o FEED lá dentro é de todo mundo. Mas
 * esta página é a dos posts DE UMA PESSOA — "o feed é da plataforma; a
 * estante, o jogo atual e os posts são do perfil do usuário" (Alex,
 * 2026-09-09) —, então ela pede a MESMA porta com um recorte de autor.
 *
 * ⚠️ SÃO DOIS REGIMES, E A DIFERENÇA É DE SEGURANÇA. Sem contexto o recorte é
 * `author=me`, que o backend lê do TOKEN. Com `?de=@fulano` ele é o id_user
 * dele — e o backend só aceita um id explícito quando a comunidade é
 * PLATAFORMA, onde ninguém entra e o feed já é público. Numa comunidade
 * FECHADA um id aqui daria a qualquer um uma listagem por autor de dentro de
 * um lugar em que ele não entrou, e lá o parâmetro é ignorado.
 *
 * ─── A RECUSA É DITA EM VOZ ALTA ─────────────────────────────────────────────
 *
 * O pill aparece para quem visita, e visitante de comunidade fechada leva 403
 * na leitura do feed. Grade vazia diria "ninguém postou nada", que é outra
 * coisa — então o 403 vira uma frase, não um vazio.
 */

import { useCallback, useEffect, useState } from "react"
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

// O fundo do ambiente: uma textura estática na cor da plataforma. Import
// DIRETO (e não por `dynamic`) porque ele deixou de ser um shader e virou
// quatro divs de CSS — um chunk à parte só faria a cor do ambiente piscar na
// entrada da tela. Ver components/platform/tech-backdrop.tsx.
import { TechBackdrop } from "@/components/platform/tech-backdrop"

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
  // Lido no efeito e não no render: `getToken()` toca o localStorage, e ler
  // armazenamento durante o render torna a tela impura (o `react-hooks/purity`
  // reprova) além de divergir entre servidor e cliente.
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => { setSignedIn(!!getToken()) }, [])

  /**
   * O DONO DO RECORTE, resolvido do `?de=@fulano` que o pill trouxe.
   *
   * Lido do WINDOW e uma vez só, pela mesma razão de sempre:
   * `useSearchParams` obriga Suspense e tira a rota do pré-render.
   *
   * `undefined` = ainda resolvendo (a grade espera, senão ela buscaria os
   * posts de quem olha e depois trocaria por baixo); `null` = sem contexto,
   * que é a vitrine própria.
   */
  const [owner, setOwner] = useState<{ id_user: string; username: string; name?: string | null } | null | undefined>(undefined)
  useEffect(() => {
    const who = new URLSearchParams(window.location.search).get("de")
    if (!who) { setOwner(null); return }
    const token = getToken()
    if (!token) { setOwner(null); return }
    let alive = true
    fetch(`/api/gamer/profile/${encodeURIComponent(who.replace(/^@/, ""))}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return
        // Contexto que não resolve cai na vitrine própria, nunca numa parede:
        // a página continua inteira sem ele.
        setOwner(d?.owner?.id_user && !d?.is_me ? d.owner : null)
      })
      .catch(() => { if (alive) setOwner(null) })
    return () => { alive = false }
  }, [])

  const fetchPosts = useCallback(
    async (reset: boolean, from?: string | null) => {
      if (reset) setLoading(true)
      else setLoadingMore(true)
      try {
        // O recorte é o que torna esta grade a vitrine DE UM PERFIL dentro da
        // plataforma. Sem sessão não há "me" — e é por isso que o vazio de quem
        // não entrou diz para entrar, em vez de "ninguém postou".
        const sp = new URLSearchParams({ limit: "24", author: owner ? owner.id_user : "me" })
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
    [communityId, owner]
  )

  useEffect(() => {
    // ESPERA o contexto resolver. Sem isso a grade buscaria os posts de quem
    // olha e os trocaria por baixo quando o `?de=` chegasse — a pessoa veria
    // por um instante a vitrine errada, dentro do games de outra.
    if (owner === undefined) return
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
  }, [communityId, fetchPosts, owner])

  const accent = accentHex(community?.community_theme?.accent ?? null)
  // O "Voltar" devolve ao games NO MESMO CONTEXTO: sem o `?de=` a pessoa
  // sairia da vitrine de alguém e cairia no próprio recorte, como se tivesse
  // trocado de lugar sem pedir.
  const backHref = owner
    ? `/comunidades/${communityId}?de=${encodeURIComponent(owner.username)}`
    : `/comunidades/${communityId}`
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
        <PageBackLink href={backHref} className="mb-5" />

        <header
          className="border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-6"
          style={{ boxShadow: `8px 8px 0 0 ${accent}` }}
        >
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A938A]">
            <Gamepad2 className="h-3.5 w-3.5" style={{ color: accent }} />
            {community?.display_name || "—"}
          </span>
          {/* O TÍTULO DIZ DE QUEM É A GRADE. Sem isso, a vitrine de outra
              pessoa e a sua ficam idênticas na tela — e quem chegasse por um
              link compartilhado leria os posts dela como se fossem os seus. */}
          <h1 className="mt-1 fl-display text-4xl leading-[0.9] text-[#F5F1E8] md:text-6xl">
            {owner
              ? t("gamePostsTitleOf", "Posts de {who}").replace("{who}", owner.name || `@${owner.username}`)
              : t("gamePostsTitle", "Posts de games")}
          </h1>
          {/* O subtítulo era o jogo DO ESPAÇO, e espaço de games não existe mais
              (mig 232): o jogo atual é de cada pessoa e mora no painel laranja da
              plataforma. Buscá-lo aqui só para escrever uma linha custaria uma
              requisição a mais numa tela que já é uma grade de capas. */}
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
            {/* DOIS vazios, porque são duas situações diferentes: quem não entrou
                não tem "meus posts" para ter, e dizer a ele que não publicou nada
                seria afirmar algo que ninguém mediu. */}
            {/* TRÊS vazios, porque são três situações diferentes: quem não
                entrou não tem "meus posts" para ter; quem entrou e não publicou
                precisa saber que o lugar é dele; e a vitrine de outra pessoa
                fala DELA — dizer "você não publicou" ali seria falar do
                visitante numa tela que não é sobre ele. */}
            <p className="text-sm text-[#9A938A]">
              {owner
                ? t("gamePostsEmptyOther", "{who} ainda não publicou nada aqui.")
                    .replace("{who}", owner.name || `@${owner.username}`)
                : signedIn
                  ? t("gamePostsEmptyMine", "Você ainda não publicou nada aqui.")
                  : t("gamePostsSignedOut", "Entre na sua conta para ver os seus posts de games.")}
            </p>
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
