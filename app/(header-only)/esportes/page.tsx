"use client"

// /esportes — A PLATAFORMA ESPORTES da Freelandoo inteira (a antiga Fitness;
// /fitness redireciona para cá — next.config.mjs). O `community_kind` por
// dentro continua 'fitness'.
//
// ⚠️ É A CÓPIA DA RAIZ DO GAMES (pedido do Alex, 2026-10-09: "transformar a
// comunidade fitness em uma comunidade igual a todas, a primeira tela é o feed
// geral de todo mundo que posta"). A mig 276 garantiu que existe UMA plataforma
// dessas e que ninguém precisa entrar nela; o feed, o composer, a curtida, o
// comentário e a escolha "feed geral × só aqui" são a máquina de comunidade que
// já existe. Um feed próprio aqui seria a segunda máquina para a mesma coisa.
//
// AS ABAS (pedido do Alex, 2026-10-26):
// - GERAL: os posts de todos os esportes;
// - MEU ESPORTE: só os posts do esporte da pessoa (o esporte escolhido em cada
//   post, mig 306 — `scope=my_sport` na MESMA porta do feed);
// - uma aba com o NOME DE CADA ACADEMIA conectada: a comunidade da academia
//   (ver academy-tab.tsx). Para o aluno, ela substituiu a página da academia.
// A aba vale na URL (`?aba=geral|meu|<slug>`) — é para onde a página da
// academia e a lista de academias mandam o aluno.
//
// ⚠️ O "MEU DIA" (calorias, água, refeições, metas) mora no topo de
// `/esportes/historico`, atrás do pill turquesa. Não recolocar aqui: a raiz é a
// parte PÚBLICA da plataforma; o que é da pessoa mora atrás da foto.

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AlertCircle, Building2, Flag, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { useMeProfile } from "@/hooks/use-me-profile"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { PublishMenuButton, type PublishItem } from "@/components/composer/publish-menu-button"
import { FitnessShell } from "./_components/fitness-shell"
import { FitnessHeadcard } from "./_components/fitness-headcard"
import { FitnessProposalsGate } from "./_components/proposals-modal"
import { SportPickerModal, type SportOption } from "./_components/sport-picker-modal"
import { AcademyTab, type AcademyMembership } from "./_components/academy-tab"
import { EMBER, StateBox } from "./_components/fitness-ui"
import { SpeedBand } from "./_components/ui/speed-band"
import { SPRING } from "./_components/ui/motion"

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

/** "geral", "meu" ou o slug de uma academia conectada. */
type Tab = string

const noop = () => {}

function lerAba(): Tab {
  if (typeof window === "undefined") return "geral"
  return new URLSearchParams(window.location.search).get("aba") || "geral"
}

export default function SportsFeedPage() {
  const tr = useTranslations("Fitness")
  const ts = useTranslations("Sports")
  const router = useRouter()
  const { perfil } = useMeProfile()

  const [platform, setPlatform] = useState<Platform | null>(null)
  const [loadingPlatform, setLoadingPlatform] = useState(true)
  const [error, setError] = useState("")

  const [tab, setTabState] = useState<Tab>("geral")
  const [sport, setSport] = useState<string | null>(null)
  const [sportOptions, setSportOptions] = useState<SportOption[]>([])
  const [sportLoaded, setSportLoaded] = useState(false)
  const [picker, setPicker] = useState<null | "first" | "change">(null)
  const [academies, setAcademies] = useState<AcademyMembership[]>([])

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

  const setTab = useCallback((next: Tab) => {
    setTabState(next)
    const url = new URL(window.location.href)
    if (next === "geral") url.searchParams.delete("aba")
    else url.searchParams.set("aba", next)
    window.history.replaceState(null, "", url.toString())
  }, [])

  useEffect(() => {
    setTabState(lerAba())
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
          throw new Error(d?.error || tr("feedLoadError", "Não deu pra abrir o feed de Esportes."))
        }
        setPlatform(d.platform)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoadingPlatform(false))
    return () => {
      cancelled = true
    }
  }, [tr])

  /** O esporte da pessoa — sem ele, o modal do primeiro acesso abre. */
  useEffect(() => {
    const token = getToken()
    if (!token) return
    fetch("/api/fitness/sport", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setSportOptions(Array.isArray(d.options) ? d.options : [])
        setSport(d.sport || null)
        if (!d.sport) setPicker("first")
      })
      .catch(() => {})
      .finally(() => setSportLoaded(true))
  }, [])

  /** As academias conectadas viram abas. */
  const loadAcademies = useCallback(() => {
    const token = getToken()
    if (!token) return
    fetch("/api/me/academy-memberships", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const ms: { id_academy: string; academy?: { nome?: string; slug?: string } }[] = Array.isArray(d?.memberships)
          ? d.memberships
          : []
        setAcademies(
          ms
            .filter((m) => m.academy?.slug)
            .map((m) => ({ id_academy: m.id_academy, nome: m.academy?.nome || "", slug: m.academy?.slug || "" }))
        )
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadAcademies()
  }, [loadAcademies])

  const academyTab = academies.find((a) => a.slug === tab) || null
  const feedTab = tab === "meu" ? "meu" : "geral"

  /** O feed é o `feed-posts` DA COMUNIDADE — a mesma porta do Games e do Financeiro. */
  const fetchPosts = useCallback(
    async (reset: boolean, next?: string | null) => {
      if (!platform?.id_profile) return
      if (reset) setLoadingPosts(true)
      else setLoadingMore(true)
      try {
        const sp = new URLSearchParams({ limit: "10" })
        if (feedTab === "meu") sp.set("scope", "my_sport")
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
    [platform?.id_profile, feedTab]
  )

  useEffect(() => {
    if (!academyTab) void fetchPosts(true)
  }, [fetchPosts, academyTab, sport])

  const publishItems: PublishItem[] = [
    { kind: "post", label: tr("postLabel", "Post") },
    { kind: "bee", label: tr("curtoLabel", "Curto") },
    { kind: "story", label: tr("beeLabel", "Bee") },
    { kind: "recado", label: tr("recadoLabel", "Recado") },
  ]
  // "Adicionar academia" mora no "+" (pedido do Alex): leva à lista de
  // academias, onde tocar numa delas pede o CPF e conecta.
  const publishExtras = [{ id: "academia", label: ts("addAcademy", "Adicionar academia"), icon: Building2 }]
  const onPickExtra = (id: string) => {
    if (id === "academia") router.push("/academias")
  }

  const onPick = (kind: string) => {
    if (kind === "recado") {
      setRecadoOpen(true)
      return
    }
    setComposerKind(kind as "post" | "bee" | "story")
    setComposerOpen(true)
  }

  const publishText = tr("publishCta", "Publicar em Esportes")
  const composeLabel = tr("composeCta", "Publicar")
  const sportLabel = sportOptions.find((o) => o.key === sport)?.label || null

  const tabs: { key: Tab; label: string }[] = [
    { key: "geral", label: ts("tabAll", "Geral") },
    { key: "meu", label: ts("tabMine", "Meu esporte") },
    ...academies.map((a) => ({ key: a.slug, label: a.nome })),
  ]

  const publishMenu = (variant?: "block" | "bar") => (
    <PublishMenuButton
      variant={variant}
      text={variant ? publishText : undefined}
      accent={EMBER}
      label={composeLabel}
      items={publishItems}
      onPick={onPick}
      extras={publishExtras}
      onPickExtra={onPickExtra}
    />
  )

  return (
    <FitnessShell>
      {/* Propostas pendentes do professor: a raiz é a porta de entrada, então
          o modal precisa aparecer aqui também (e não só no Histórico). */}
      <FitnessProposalsGate onApplied={noop} />

      <FitnessHeadcard
        perfil={perfil}
        title={tr("platformTitle", "Esportes")}
        backHref="/account"
        action={publishMenu()}
      />

      {/* As abas — repaginada 2026-10-27: SEM rolagem horizontal (rolava com
          academia de nome comprido). Grade de colunas iguais que quebra em
          linhas; o marcador laranja é UM bloco que desliza entre as abas. */}
      <nav className="mx-auto mt-6 w-full max-w-5xl px-3 md:px-10" aria-label={ts("tabsAria", "Seções de Esportes")}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(104px,1fr))] border-2 border-[#0B0B0D]" style={{ boxShadow: "3px 3px 0 0 #0B0B0D" }}>
          {tabs.map((tb) => {
            const on = (academyTab ? academyTab.slug : feedTab) === tb.key
            return (
              <motion.button
                key={tb.key}
                type="button"
                onClick={() => setTab(tb.key)}
                aria-pressed={on}
                whileTap={{ y: 2 }}
                title={tb.label}
                className={`relative min-w-0 px-3 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition-colors ${
                  on ? "text-[#0B0B0D]" : "bg-[#1D1810] text-[#F5F1E8]/80 hover:text-[#F5F1E8]"
                }`}
              >
                {on && <motion.span layoutId="esp-root-tab" className="absolute inset-0 bg-[#FF8C2B]" transition={SPRING.pill} />}
                <span className="relative block truncate">{tb.label}</span>
              </motion.button>
            )
          })}
        </div>
      </nav>

      <section className="mx-auto mt-6 w-full max-w-5xl px-0 md:px-10">
        {academyTab ? (
          <AcademyTab
            academy={academyTab}
            onUnlinked={() => {
              setTab("geral")
              loadAcademies()
            }}
          />
        ) : (
          <>
            {feedTab === "meu" && sportLoaded && (
              <div className="mb-4 px-3 md:px-0">
                <SpeedBand
                  color={EMBER}
                  ink="#0B0B0D"
                  icon={<Flag className="h-5 w-5" />}
                  kicker={ts("mySportKicker", "Seu esporte")}
                  title={sportLabel || ts("noSportYet", "Você ainda não escolheu seu esporte.")}
                  action={
                    <motion.button
                      type="button"
                      whileTap={{ x: 2, y: 2 }}
                      onClick={() => setPicker(sport ? "change" : "first")}
                      className="border-2 border-[#0B0B0D] bg-[#0B0B0D] px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FB923C]"
                      style={{ boxShadow: "3px 3px 0 0 #7C2D12" }}
                    >
                      {sport ? ts("changeSport", "Trocar") : ts("chooseSport", "Escolher esporte")}
                    </motion.button>
                  }
                />
              </div>
            )}

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
              publishMenu("block")
            ) : (
              <div className="space-y-3">
                {/* Com publicações, a mesma porta vira faixa fina: quem chega aqui
                    veio ler, e o convite não pode competir com o conteúdo. */}
                {publishMenu("bar")}
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
          </>
        )}
      </section>

      <CommentsPanel
        postId={openCommentsFor}
        open={!!openCommentsFor}
        onClose={() => setOpenCommentsFor(null)}
        loginNextPath="/esportes"
        onCountChange={(pid, delta) =>
          setPosts((prev) =>
            prev.map((p) =>
              p.post_id === pid ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 0) + delta) } : p
            )
          )
        }
      />

      {picker && sportOptions.length > 0 && (
        <SportPickerModal
          options={sportOptions}
          current={sport}
          firstTime={picker === "first"}
          onClose={() => setPicker(null)}
          onPicked={(s) => {
            setSport(s)
            setPicker(null)
          }}
        />
      )}

      {composerOpen && platform && (
        <MediaComposer
          open
          mode={composerKind}
          communityId={platform.id_profile}
          communityName={platform.display_name || tr("platformTitle", "Esportes")}
          // O esporte do post (mig 306): já marcado com o da pessoa.
          sportOptions={sportOptions}
          defaultSport={sport}
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
          sport={sport}
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
