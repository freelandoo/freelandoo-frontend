"use client"

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import {
  Users, Trophy, ArrowLeft, Palette, Crown, Shield, ScrollText, Eye,
  ImagePlus, Loader2, Save, Hash, Sparkles, Target, Megaphone, Star,
  Pin, Trash2, BarChart3, Plus, Hexagon, X, MessageSquare,
  Lock, Globe, PawPrint, Car, Gamepad2, UserRound, LayoutGrid,
} from "lucide-react"
import Link from "next/link"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { useTaxonomy } from "@/lib/i18n/taxonomy"
import { getToken, getStoredUser } from "@/lib/auth"
import type { FeedFilters, FeedPost } from "@/lib/types/portfolio-feed"
import { PublishMenuButton, type PublishItem } from "@/components/composer/publish-menu-button"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"
// Os botões retráteis atrás da foto — a MESMA mecânica do headcard do perfil e
// da Carteira. Aqui a pilha é a da COMUNIDADE: por enquanto um botão só,
// "Perfil" (azul), que abre o que a comunidade é — enxame, privacidade,
// temporada e o texto do líder. Botão novo de headcard de comunidade entra
// nessa pilha, nunca como bloco solto no meio da página.
import { PillStack, type PillSpec } from "@/components/profile/headcard-pills"
// A coluna retrátil dos números (membros, nível, XP, benchmark, destaque e
// ranking). A peça é só a MECÂNICA — o que entra na coluna é desta página.
import { RetractableColumn } from "@/components/tabloide"
// A plataforma de games troca o conteúdo do dock global. Quem sabe que a rota é
// games é ESTA página (a modalidade não está na URL), então é ela que declara.
import { CommunityShellBeacon, onCommunityView } from "@/components/layout/community-shell"
// A paleta editável do líder e o formatador de XP moram FORA desta página: o
// ranking cheio (`[id]/ranking`) pinta o pódio com o MESMO accent, e uma cópia
// da lista faria as duas telas da mesma comunidade divergirem de tom.
import {
  ACCENTS,
  accentHex,
  BACKDROPS,
  backdropTint,
  canBuildCommunitySite,
  compact,
  platformSkinVars,
} from "./_components/community-ui"

const PortfolioPostCard = dynamic(
  () => import("@/components/feed/portfolio-post-card").then((m) => m.PortfolioPostCard),
  { ssr: false }
)
// O fundo do ambiente: uma textura estática na cor da plataforma. Import
// DIRETO (e não por `dynamic`) porque ele deixou de ser um shader e virou
// quatro divs de CSS — um chunk à parte só faria a cor do ambiente piscar na
// entrada da tela. Ver components/platform/tech-backdrop.tsx.
import { TechBackdrop } from "@/components/platform/tech-backdrop"
import { initialsOf } from "@/lib/initials"
const CommentsPanel = dynamic(
  () => import("@/components/comments/comments-panel").then((m) => m.CommentsPanel),
  { ssr: false }
)
const MediaComposer = dynamic(
  () => import("@/components/composer/MediaComposer").then((m) => m.MediaComposer),
  { ssr: false }
)
// Condomínio (migs 205/206) NÃO tem mais tela própria: todas as comunidades
// usam esta casca. O que é do prédio — planta, portaria, família × disputa,
// veredito do síndico — entra como SEÇÃO, carregada só quando é o caso.
const CondoResidence = dynamic(
  () => import("./_components/condo-residence").then((m) => m.CondoResidence),
  { ssr: false }
)
// A estante (mig 220) só aparece na comunidade de games e só para quem chega
// na aba: carregar o módulo dela em toda comunidade seria pagar o peso em
// condomínio, bairro e pet, que nunca vão abri-la.
const GamerShelf = dynamic(
  () => import("./_components/gamer-shelf").then((m) => m.GamerShelf),
  { ssr: false }
)

/** As abas da comunidade. "shelf" só existe na de games (mig 220). */
type CommunityTab = "feed" | "members" | "shelf"
// "Meu Site" (mig 212) NÃO mora mais aqui: o construtor virou a página
// `/comunidades/<id>/site`. Ele monta uma página inteira, e encaixá-la numa
// aba embaixo do feed mostrava um site diferente do que ia ao ar. As duas
// portas daqui — o item "Meu Site" do menu "+" e a aba "Site" — LEVAM até lá.
// Avisos, anúncios internos, enquetes e lista de vizinhos (migs 197-199).
// Continuam existindo — o que morreu foi a TELA separada, não as features.
const CondoExtras = dynamic(
  () => import("./_components/condo-extras").then((m) => m.CondoExtras),
  { ssr: false }
)

// Campos do editor de assunto: mesma pele reta dos outros controles da página.
const selectCls =
  "h-10 w-full border-2 border-[#0B0B0D] bg-[#1D1810] px-3 text-sm text-[#F5F1E8] outline-none focus:border-[#F2B705]"

type Theme = { primary?: string; background?: string; text?: string; accent?: string }
type Community = {
  id_profile: string
  id_leader_user: string | null
  display_name: string
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  enxame_name: string | null
  // O enxame da comunidade comum agora é EDITÁVEL na página (mig 219), então o
  // id — e não só o nome — precisa chegar aqui para pré-selecionar o campo.
  id_machine?: number | null
  community_theme: Theme | null
  // Opcionais: o backend recorta contadores por tier do viewer — comunidade
  // privada e condomínio não os devolvem para quem está de fora.
  xp_total?: number
  xp_level?: number
  member_count?: number
  privacy?: "public" | "private"
  monthly_cents?: number | null
  viewer_is_member?: boolean
  viewer_sub_status?: string | null
  // Modalidade (migs 196/205/210). Todas as modalidades renderizam nesta MESMA
  // casca; o que muda é quais seções aparecem e quem pode escrever.
  // "finance" nunca abre por esta rota hoje (o Financeiro tem casca própria em
  // /wallet), mas está na lista porque a REGRA de plataforma é a mesma das duas
  // — deixá-lo de fora faria o predicado mentir no dia em que ele passasse aqui.
  kind?: "common" | "academy" | "condo" | "neighborhood" | "pet" | "car" | "games" | "finance"
  // Assunto das modalidades da mig 210: a raça do pet, o modelo do carro, o
  // jogo. É o que dá identidade à página — sem ele o cabeçalho do "Rex" não
  // diz que Rex é um vira-lata.
  subject?: {
    kind: "pet" | "car" | "games"
    species?: string | null
    breed_label?: string | null
    is_mixed?: boolean
    birth_year?: number | null
    brand_code?: string | null
    model_code?: string | null
    brand_label?: string | null
    model_label?: string | null
    platform?: string | null
    game_title?: string | null
    gamertag?: string | null
  } | null
  // Endereço do condomínio. SENSÍVEL: o backend só devolve rua/número/CEP
  // para morador confirmado ou administração (CondoRules é a fonte única) —
  // aqui os campos são opcionais porque para visitante eles simplesmente NÃO
  // EXISTEM na resposta, e não porque venham vazios.
  address?: {
    street?: string | null
    number?: string | null
    complement?: string | null
    neighborhood?: string | null
    cep?: string | null
    municipio?: string | null
    estado?: string | null
  } | null
  address_is_full?: boolean
  // "Meu Site" (mig 212): existe site PUBLICADO? Vem no mesmo GET da comunidade
  // para a aba Site não custar uma requisição a mais em toda visita.
  has_site?: boolean
  viewer_is_admin?: boolean
  viewer_is_resident?: boolean
  viewer_has_pending_claim?: boolean
  viewer_units?: { id_unit: number; number: string; block_name: string | null }[]
  viewer_parking?: { id_spot: number; code: string }[]
}
type CommunityBee = {
  id_story: string
  video_url: string | null
  thumbnail_url: string | null
  caption: string | null
  profile_name: string | null
  profile_avatar: string | null
  author_username: string | null
  created_at: string
}
type MembershipSummary = {
  active_subs: number
  past_due_subs: number
  waiting_cents: number
  available_cents: number
  paid_cents: number
  total_net_cents: number
  payments_count: number
}
type Member = {
  id_user: string
  role: "leader" | "vice" | "member"
  user_name: string | null
  user_username: string | null
  top_profile_avatar: string | null
  top_profile_name: string | null
  top_profile_level: number | null
  top_profile_xp: number
}
type GoalRankRow = { id_user: string; name: string | null; username: string | null; avatar_url: string | null; xp_level: number | null; score: number; posts?: number; eng?: number }
type Goal = {
  id: number; title: string; metric: string; target_value: number | null
  prize_polens: number; status: string; starts_at: string; ends_at: string | null; closed_at: string | null
  progress: number; percent: number | null; winner_user_id: string | null
  winner: { id_user: string; name: string | null; avatar_url: string | null; score: number } | null
  ranking: GoalRankRow[]
}
type Announcement = { id: number; body: string; is_pinned: boolean; created_at: string; author_username: string | null; author_name: string | null }
type Benchmark = { position: number; total: number; percentile: number | null; enxame_name: string | null }

function fmtBRL(cents: number): string {
  return (Number(cents || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

const FEED_FILTERS: FeedFilters = { id_machine: null, id_category: null, estado: null, municipio: null, level_min: null }

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const t = useTranslations("Community")
  const tx = useTaxonomy()

  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [goal, setGoal] = useState<Goal | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null)
  const [tab, setTab] = useState<CommunityTab>("feed")
  const router = useRouter()
  const sitePath = id ? `/comunidades/${id}/site` : "/account"
  // O menu do "+" mora no HEADCARD e a aba fica MUITO abaixo (privacidade,
  // enxame, perfil...). Trocar a aba dali sozinho não muda nada na parte da
  // tela que a pessoa está olhando — parece botão quebrado. Por isso o item
  // do menu troca a aba E leva a pessoa até ela.
  const tabsRef = useRef<HTMLDivElement | null>(null)
  const goToTab = useCallback((key: CommunityTab) => {
    setTab(key)
    // Depois da pintura: a aba só existe no DOM no quadro seguinte.
    requestAnimationFrame(() => {
      tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Feed estilo grupo
  const [posts, setPosts] = useState<FeedPost[]>([])
  // Faixa de bees do mural (mig 208): os bees publicados AQUI. Vivem pela
  // mesma regra do resto do site — 24h + 1h por ponto de engajamento, teto de
  // 7 dias —, então a faixa esvazia sozinha, sem job e sem "arquivar".
  const [bees, setBees] = useState<CommunityBee[]>([])
  const [postsCursor, setPostsCursor] = useState<string | null>(null)
  const [postsHasMore, setPostsHasMore] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingMorePosts, setLoadingMorePosts] = useState(false)
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  // "post" = foto/texto · "bee" = Curto (vídeo permanente) · "story" = Bee
  // (o vídeo que dura mais quanto mais engajamento recebe). Os nomes internos
  // são os do Bees v2 — renomeá-los aqui quebraria o MediaComposer.
  const [composerKind, setComposerKind] = useState<"post" | "bee" | "story">("post")

  // Recado (nota só-texto, até 2000 chars)
  const [recadoOpen, setRecadoOpen] = useState(false)
  const [recadoBody, setRecadoBody] = useState("")
  const [postingRecado, setPostingRecado] = useState(false)

  // Edição (líder)
  const [edit, setEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameDraft, setNameDraft] = useState("")
  const [bioDraft, setBioDraft] = useState("")
  // Assunto das modalidades da mig 210 (raça do pet, modelo do carro, jogo).
  // Editado AQUI, no modo de edição da própria comunidade — não há modal de
  // cadastro: a comunidade nasce vazia e é batizada dentro de si mesma.
  const [petDraft, setPetDraft] = useState({ species: "", breed_slug: "", breed_label: "", birth_year: "" })
  const [gameDraft, setGameDraft] = useState({ platform: "", game_title: "", gamertag: "" })
  // O JOGO ATUAL É DA PESSOA (mig 232), não da plataforma: cada um vê e edita o
  // seu, como a Carteira dentro do Financeiro. Por isso ele NÃO vem no payload
  // da comunidade (`community.subject` é null em games) e tem estado próprio.
  const [myGame, setMyGame] = useState<{
    platform?: string | null
    game_title?: string | null
    gamertag?: string | null
  } | null>(null)
  const [savingGame, setSavingGame] = useState(false)
  /**
   * ⚠️ O DONO DO CONTEXTO — quem é a pessoa cujo games você está vendo.
   *
   * Games é UMA casa (mig 232): o feed é público e comunitário, e o nome, a
   * foto e as cores são do admin. Mas o que está DENTRO dela é de cada um, e
   * até aqui só havia um recorte possível: o de quem estava logado. Entrar
   * pelo perfil de alguém (`?de=@fulano`) troca esse recorte — estante, jogo
   * atual e vitrine de posts passam a ser os DELE.
   *
   * `null` = sem contexto: a plataforma abre no recorte de quem olha, que é o
   * comportamento de sempre e continua sendo o certo pelo pill do próprio
   * perfil e pelo dock.
   */
  const [gamesCtx, setGamesCtx] = useState<{
    owner: { id_user: string; username: string; name?: string | null; avatar_url?: string | null }
    subject: { platform?: string | null; game_title?: string | null; gamertag?: string | null } | null
    is_me: boolean
  } | null>(null)
  const [carDraft, setCarDraft] = useState({ brand_code: "", model_code: "" })
  const [breeds, setBreeds] = useState<{ id_breed: number; slug: string; label: string }[]>([])
  const [carBrands, setCarBrands] = useState<{ code: string; label: string }[]>([])
  const [carModels, setCarModels] = useState<{ code: string; label: string }[]>([])
  const [accentDraft, setAccentDraft] = useState("gold")
  // A COR DO FUNDO da plataforma de negócio (pedido do Alex, 2026-09-09: "hoje
  // só dá pra mudar a cor dos detalhes, eu queria poder mudar até a cor do
  // fundo"). Mora no MESMO `community_theme` do accent — é a mesma pergunta
  // ("com que cara esta comunidade aparece"), e um lugar novo para guardá-la
  // faria a tela pedir duas gravações para uma edição só.
  const [bgDraft, setBgDraft] = useState("black")
  // Enxame (mig 219): a comunidade comum nasce sem ele e o líder escolhe aqui.
  const [machineDraft, setMachineDraft] = useState("")
  const [enxames, setEnxames] = useState<{ id_machine: number; name: string }[]>([])
  const [uploading, setUploading] = useState<"banner" | "avatar" | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const seeded = useRef(false)
  const autoEdited = useRef(false)

  // Privacidade (comunidade privada com mensalidade)
  const [privacyDraft, setPrivacyDraft] = useState<"public" | "private">("public")
  const [monthlyDraft, setMonthlyDraft] = useState("") // em reais, ex.: "19,90"
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [membershipSummary, setMembershipSummary] = useState<MembershipSummary | null>(null)

  // Meta + mural
  const [goalFormOpen, setGoalFormOpen] = useState(false)
  const [goalTitle, setGoalTitle] = useState("")
  const [goalMetric, setGoalMetric] = useState("xp")
  const [goalDays, setGoalDays] = useState(30)
  const [savingGoal, setSavingGoal] = useState(false)
  const [annBody, setAnnBody] = useState("")
  const [annPin, setAnnPin] = useState(false)
  const [postingAnn, setPostingAnn] = useState(false)

  // Qual painel dos botões retráteis está aberto — UM POR VEZ, como os próprios
  // pills. O que a comunidade É (perfil: enxame, privacidade, temporada e o
  // texto do líder) e o que ela ANUNCIA (o mural) saíram dos blocos empilhados
  // no meio da página: quem visita lia caixas de configuração antes de chegar
  // no feed, e a maioria delas nem aparecia para ele. Agora todo mundo abre os
  // mesmos painéis; o que muda é que o líder EDITA e o visitante LÊ.
  //
  // Painel novo entra AQUI (no tipo) e na lista de pills abaixo — os dois lados
  // são a mesma decisão, e separá-los deixaria um botão sem painel.
  //
  // Na modalidade GAMES a lista é outra (ver `isGamesPlatform` abaixo): o
  // painel azul de perfil não existe — enxame, privacidade e temporada são
  // perguntas de comunidade COM MEMBROS, e ali não há membro nenhum.
  type CommunityPanel = "profile" | "mural" | "game"
  const [panel, setPanel] = useState<CommunityPanel | null>(null)

  const storedUser = getStoredUser()
  const currentUserId = storedUser?.id_user ?? null

  /**
   * ⚠️ A FOTO DE QUEM OLHA VEM DE `/users/me`, NUNCA DO `localStorage`.
   *
   * Ela era lida de `storedUser.avatar` — e esse campo NÃO EXISTE: o payload do
   * login não devolve avatar em nenhum dos dois caminhos (senha e Google), e
   * nunca devolveu (conferido com `git log -S` em `AuthService`). O único outro
   * escritor da chave é o `/bem-vindo`, que só carimba o tour preservando o
   * resto. Resultado: `myAvatar` era `undefined` para TODA conta, e a foto da
   * plataforma caía no boneco cinza sem erro nenhum aparecer.
   *
   * ⚠️ É ISSO QUE FAZIA "UNS PUXAREM E OUTROS NÃO", e a assimetria tem duas
   * metades: visitando o games de OUTRA pessoa a foto vinha do backend
   * (`GameProfileService._card` devolve `u.avatar`, de `tb_user`) e aparecia;
   * o SEU próprio games lia o localStorage vazio e não aparecia. Duas fontes
   * para o mesmo rosto na mesma tela.
   *
   * A fonte certa é a MESMA que `/account` e a Carteira já usam — `tb_user.avatar`,
   * que a mig 215 cravou como fonte única do rosto da pessoa. Aqui ela é lida
   * direto em vez de pelo `useMeProfile`, porque aquele hook EMPURRA PARA O
   * LOGIN quando não há token: esta página é pública (o feed de games abre para
   * visitante anônimo), e usá-lo trancaria a porta da plataforma inteira.
   */
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const isLeader = !!community && !!currentUserId && community.id_leader_user === currentUserId

  // ─── PLATAFORMA × COMUNIDADE ────────────────────────────────────────────────
  //
  // Games (mig 232) e o Financeiro (mig 229) não são comunidades de ninguém:
  // são PLATAFORMAS do site inteiro. Ninguém entra, ninguém lidera
  // (`id_leader_user` é NULL de propósito) e quem edita nome, foto e CORES é o
  // ADMIN DA PLATAFORMA — pedido do Alex (2026-09-09): "só o admin da
  // plataforma pode alterar (...) e as cores só o admin pode alterar".
  //
  // ⚠️ E O QUE ESTÁ DENTRO DELA CONTINUA SENDO DE CADA UM: "o feed é da
  // plataforma; a estante, o jogo atual e os posts são do perfil do usuário, a
  // mesma coisa da carteira e da vaquinha". É por isso que existem DOIS
  // predicados aqui e não um: `canAdminister` decide a casca (o que é da
  // casa), e o que é da pessoa é gateado por estar logado.
  //
  // ⚠️ O ESPELHO ERRA PARA MENOS. Quem manda é o backend
  // (`CommunityService._assertCommunityAdmin`); aqui só se evita OFERECER o
  // que ele recusaria.
  const isPlatformSpace = community?.kind === "games" || community?.kind === "finance"
  // A leitura do admin é a MESMA das outras superfícies (UserDropside,
  // ProfileSidebar, EditableImage). As duas metades dizem a MESMA coisa: o
  // `is_admin` que o login guarda é o resultado de `AuthStorage.isAdmin`, que
  // é o papel Administrator — o `roles` fica como leitura de payload antigo,
  // e é por isso que o espelho bate com o guard do backend em vez de ser mais
  // largo que ele.
  const isPlatformAdmin = !!(
    storedUser?.is_admin ||
    storedUser?.roles?.some((r) => r.desc_role === "Administrator")
  )
  const canAdminister = isPlatformSpace ? isPlatformAdmin : isLeader
  const myMembership = useMemo(
    () => members.find((m) => m.id_user === currentUserId) || null,
    [members, currentUserId]
  )
  const isMember = isLeader || !!myMembership || !!community?.viewer_is_member

  // Condomínio: MEMBRO não basta para escrever. Quem publica, vota e vê
  // vizinhos é o MORADOR — titular reconhecido de um apartamento (migs
  // 205/206). Quem entrou e ainda não confirmou lê e não escreve.
  const isCondo = community?.kind === "condo"
  const subjectKind =
    community?.kind === "pet" || community?.kind === "car" || community?.kind === "games"
      ? community.kind
      : null

  // ─── GAMES É PLATAFORMA, NÃO COMUNIDADE COM MEMBROS ─────────────────────────
  //
  // Games é UMA plataforma do site inteiro (mig 232), como o Financeiro: quem
  // chega não "entra" nela — todo mundo lê e todo mundo publica. Tratá-la como
  // comunidade comum produzia quatro coisas que não querem dizer nada aqui: a
  // aba Membros, o contador de membros da gaveta, o botão Entrar/Sair e um
  // painel de Perfil perguntando enxame, privacidade e temporada, que são
  // perguntas sobre um GRUPO.
  //
  // No lugar delas fica o que a plataforma É — o FEED de todos — e, ao lado, o
  // que é DE CADA UM dentro dela: o JOGO ATUAL, a ESTANTE e os POSTS do
  // próprio perfil. É por isso que a pilha e as abas bifurcam aqui, num
  // predicado só, e não em cada lugar que lê "membro": espalhado, o lugar que
  // esquecesse voltaria a oferecer a porta de entrar — e porta pintada é pior
  // que porta nenhuma.
  const isGamesPlatform = subjectKind === "games"

  /**
   * ⚠️ O PREDICADO DO CONTEXTO É UM SÓ, e é ele que troca a METADE PESSOAL da
   * tela: cabeçalho, estante, jogo atual e vitrine de posts. Escrito em cada
   * lugar (`gamesCtx && !gamesCtx.is_me` solto), o que esquecesse mostraria o
   * recorte de quem olha dentro do games de outra pessoa — e sem erro nenhum.
   *
   * A METADE DA CASA NÃO PASSA POR AQUI: banner, cores, chip do ambiente e o
   * feed continuam sendo da plataforma, para todo mundo. Visitar o games de
   * alguém não é entrar num espaço dele — ele não tem um; é olhar o recorte
   * dele dentro da casa que é de todos.
   *
   * `is_me` vem do SERVIDOR: comparar ids carregados de duas origens no front
   * abriria o "Salvar" do jogo de um sobre a linha de outro no dia em que
   * discordassem.
   */
  const gamerOwner = isGamesPlatform && gamesCtx && !gamesCtx.is_me ? gamesCtx.owner : null
  const gamerOwnerLabel = gamerOwner ? gamerOwner.name || `@${gamerOwner.username}` : ""

  // As plataformas do assunto, num lugar só: os chips que o dono aperta e o
  // rótulo que quem visita lê saem DAQUI. Escritas duas vezes, "playstation"
  // viraria "PlayStation" de um lado e "Playstation" do outro em silêncio.
  const gamePlatforms = useMemo(
    () =>
      [
        ["pc", "PC"], ["playstation", "PlayStation"], ["xbox", "Xbox"],
        ["nintendo", "Nintendo"], ["mobile", t("platformMobile", "Celular")],
        ["retro", t("platformRetro", "Retrô")], ["outra", t("platformOther", "Outra")],
      ] as [string, string][],
    [t]
  )
  const platformLabel = useCallback(
    (key: string | null | undefined) =>
      (key && gamePlatforms.find(([k]) => k === key)?.[1]) || null,
    [gamePlatforms]
  )

  // Rótulo do assunto (mig 210). Carro mostra a marca junto porque "Civic LX"
  // sozinho não diz de quem é.
  //
  // ⚠️ GAMES NÃO TEM CHIP (mig 232): o backend devolve `subject` nulo ali de
  // propósito. O jogo passou a ser da PESSOA, e escrever no cabeçalho da casa
  // o jogo de alguém o anunciaria a todo visitante como se fosse o dele.
  const subjectChip = (() => {
    const sub = community?.subject
    if (!sub) return null
    if (sub.kind === "pet") return sub.breed_label || t("kindPet", "Pet")
    if (sub.kind === "car") {
      return [sub.brand_label, sub.model_label].filter(Boolean).join(" ") || t("kindCar", "Carro")
    }
    return null
  })()
  const isResident = !!community?.viewer_is_resident
  // ⚠️ NA PLATAFORMA, PUBLICAR É DE QUEM ESTÁ LOGADO. Ela não tem membros, e
  // `isMember` seria falso para todo mundo — o "+ Postar" sumiria da tela de
  // um feed que é justamente comunitário. Quem confere de verdade é o backend
  // (`linkFeedItem` isenta as plataformas da membresia).
  const canPost = isCondo
    ? isLeader || isResident
    : isPlatformSpace
      ? !!currentUserId
      : isMember

  // ─── "Meu Site" (mig 212) ───────────────────────────────────────────────────
  // A flag `comunidade_site` é kill-switch de CONSTRUÇÃO: desligada, o líder
  // perde a entrada do menu e a aba, mas um site JÁ publicado continua abrindo
  // para quem visita — desligar o interruptor segura o que ainda não nasceu,
  // não derruba o que está no ar. (Mesma regra do GET /me/spaces.)
  const siteEnabled = useFeature("comunidade_site")

  // ⚠️ E SÓ A COMUNIDADE DE NEGÓCIO TEM SITE (decisão do Alex, 2026-09-07):
  // "só meus negócios tem site, o restante não tem, nenhuma comunidade mais".
  // Isso e as outras duas metades da régua (ser o líder e a flag) moram em
  // `canBuildCommunitySite`, no `community-ui.ts`, porque a tela de ranking
  // também precisa da resposta para desenhar o globo do dock.
  // ⚠️ O predicado LÊ `community?.kind`, e NÃO `subjectKind`: aquele só carrega
  // pet, carro e games (é o ASSUNTO editável da comunidade) e vale `null` para
  // comum, condomínio e bairro. Com ele, condomínio e bairro cairiam no default
  // "common" e ficariam com a aba Site de pé.

  // ⚠️ SÓ O LÍDER VÊ A ENTRADA DO SITE (pedido do Alex, 2026-09-08).
  //
  // Antes, quem visitava também via a aba quando havia site publicado — e isso
  // era porta pintada: a aba é LINK para o CONSTRUTOR (`/comunidades/<id>/site`),
  // não para o site publicado, e o construtor recusa quem não é líder. Ou seja,
  // ela prometia ao visitante uma tela que só falharia depois do clique.
  //
  // O site publicado não perdeu nada: ele continua no ar em `/c/<slug>` e no
  // domínio próprio, que são os endereços por onde o mundo chega nele. O que
  // sumiu foi o atalho de dentro da comunidade, que nunca levava até ele.
  //
  // ⚠️ O PREDICADO É UM SÓ e a aba e o item "Meu Site" do menu "+" LEEM O MESMO:
  // escritos separados, o dia em que um mudasse deixaria o outro oferecendo uma
  // porta que a outra metade já fechou.
  const canBuildSite = canBuildCommunitySite({ kind: community?.kind, isLeader, siteEnabled })

  // ⚠️ E "VER COMO PÚBLICO" ESCONDE AS TRÊS PORTAS (pedido do Alex, 2026-09-09).
  //
  // O botão do topo alterna entre EDITAR e ver a comunidade como ela chega a
  // quem visita. A aba Site, o item "Meu Site" do menu "+" e o globo do dock
  // são exatamente o que o visitante NÃO vê — deixá-los de pé no preview faria
  // ele mentir justamente sobre o que existe para mostrar. O líder volta a elas
  // num toque, apertando "Editar", então nada fica trancado.
  //
  // A régua de PERMISSÃO continua sendo `canBuildSite` (modalidade + papel +
  // flag, no `community-ui.ts`, compartilhada com a tela de ranking); isto aqui
  // é só o que a tela mostra AGORA — e é um valor só para as três portas, pela
  // mesma razão de sempre: separados, o preview esconderia uma e ofereceria as
  // outras duas.
  const showSiteEntry = canBuildSite && edit

  // Qual AMBIENTE esta página é (o dock lê isto pelo beacon lá embaixo).
  // `null` = comunidade comum-mas-não-negócio (condomínio, bairro, pet, carro):
  // ali a barra da Freelandoo continua como está, porque não há um conjunto de
  // controles próprio a colocar no lugar dela.
  // ⚠️ UM PREDICADO SÓ para "isto é a plataforma de negócio": ele decide o
  // ambiente do dock, a pele (`.fl-business`), a textura de fundo e o seletor de
  // cor de fundo. Escrito de novo em cada um, o dia em que a régua mudasse
  // deixaria a página com a pele de um ambiente e a barra de outro.
  const isBusinessPlatform = (community?.kind ?? null) === "common"

  const shellKind: "games" | "business" | null = isGamesPlatform
    ? "games"
    : isBusinessPlatform
      ? "business"
      : null

  // A pele da plataforma de negócio é a MESMA lista de classes das outras duas
  // (em globals.css), só que lendo variáveis — porque aqui a cor é escolhida
  // pelo líder. Quem escreve as variáveis é este `style`; sem elas as classes
  // caem no marrom tabloide de sempre, que é a degradação desejada.
  const skinVars = useMemo(
    () => (isBusinessPlatform ? platformSkinVars(bgDraft) : undefined),
    [isBusinessPlatform, bgDraft]
  )
  const bizTint = useMemo(() => backdropTint(bgDraft), [bgDraft])

  const siteExtras = useMemo(
    () =>
      showSiteEntry ? [{ id: "site", label: t("mySite", "Meu Site"), icon: Globe }] : [],
    [showSiteEntry, t]
  )

  // ─── Estante (mig 220) ──────────────────────────────────────────────────────
  // A aba só existe na comunidade de GAMES e só quando a conexão de plataforma
  // está ligada no Painel de Controle. Ela mostra a biblioteca do DONO do
  // espaço: para quem visita, é o que ele joga; para ele, é onde conecta a
  // plataforma e compara com alguém.
  const gamerEnabled = useFeature("games_conexao")
  const showShelfTab = subjectKind === "games" && gamerEnabled

  const communityTabs = useMemo(
    () =>
      [
        ["feed", t("tabFeed", "Feed")],
        // Na plataforma de games não há membros para listar: a aba mostraria
        // uma linha só, a do dono, e ainda sugeriria que existe um grupo.
        ...(isGamesPlatform ? [] : ([["members", t("tabMembers", "Membros")]] as [CommunityTab, string][])),
        ...(showShelfTab ? ([["shelf", t("tabShelf", "Estante")]] as [CommunityTab, string][]) : []),
      ] as [CommunityTab, string][],
    [t, showShelfTab, isGamesPlatform]
  )

  // ─── DEEP-LINK DO DOCK ──────────────────────────────────────────────────────
  //
  // "Estante" e "Jogo atual" na barra de baixo apontam para esta MESMA página,
  // com um parâmetro dizendo o que abrir — não são telas próprias. Rodam uma
  // vez, depois que a comunidade chegou: antes disso não dá para saber se a
  // Estante existe (ela depende da flag), e abrir uma aba que a fila de abas
  // não tem deixaria a tela mostrando algo que ninguém consegue fechar.
  //
  // Lido do WINDOW e não por `useSearchParams`: o hook obriga Suspense e tira a
  // rota do pré-render — o build já quebrou exatamente assim com `?tipo=condo`.
  const deepLinkDone = useRef(false)
  useEffect(() => {
    if (!community || deepLinkDone.current) return
    deepLinkDone.current = true
    const sp = new URLSearchParams(window.location.search)
    const aba = sp.get("aba")
    const painel = sp.get("painel")
    if (aba === "estante" && showShelfTab) setTab("shelf")
    // "Membros" não existe na plataforma de games (não há membros para listar),
    // e abrir uma aba que a fila de abas não tem deixaria a tela mostrando algo
    // que ninguém consegue fechar.
    if (aba === "membros" && !isGamesPlatform) setTab("members")
    if (painel === "jogo" && isGamesPlatform) setPanel("game")
    if (painel === "perfil" && !isGamesPlatform) setPanel("profile")
    if (painel === "mural") setPanel("mural")
  }, [community, showShelfTab, isGamesPlatform])

  // ─── O DOCK PEDINDO A VISTA (sem navegar) ───────────────────────────────────
  //
  // O deep-link acima roda UMA vez, no primeiro render depois que a comunidade
  // chega — e tem que ser assim, senão ele reabriria a Estante toda vez que a
  // pessoa trocasse de aba com a URL ainda dizendo `?aba=estante`.
  //
  // Só que "Estante" e "Jogo atual" no dock apontam para ESTA página. Já
  // estando nela, o clique trocava a querystring de uma rota que não remonta:
  // a URL mudava e a tela ficava igual. Agora o dock ANUNCIA o que foi pedido e
  // quem obedece é aqui, o mesmo lugar que já decide aba e painel — dois donos
  // dessa decisão seria a tela abrindo a Estante e fechando o painel ao mesmo
  // tempo.
  useEffect(() => {
    return onCommunityView((view) => {
      if (view === "shelf") {
        if (!showShelfTab) return
        setPanel(null)
        setTab("shelf")
        return
      }
      if (view === "game") {
        if (!isGamesPlatform) return
        setPanel("game")
        return
      }
      if (view === "members") {
        if (isGamesPlatform) return
        setPanel(null)
        setTab("members")
        return
      }
      // Os dois PAINÉIS dos pills. Abrir (e não alternar): o pill alterna porque
      // o dedo está em cima dele; no dock, "Perfil" que às vezes fecha o Perfil
      // seria um botão com dois significados.
      if (view === "profile") {
        if (isGamesPlatform) return
        setPanel("profile")
        return
      }
      if (view === "mural") {
        setPanel("mural")
        return
      }
      // "Feed" é a volta: fecha o painel aberto E devolve a aba. Fechar só um
      // dos dois deixaria a pessoa apertando o mesmo botão sem sair do lugar.
      setPanel(null)
      setTab("feed")
    })
  }, [showShelfTab, isGamesPlatform])

  const accent = accentHex(accentDraft)

  // A SOMBRA DURA é a assinatura do tabloide — o deslocamento de 8px que faz o
  // card parecer papel recortado. Dentro do ambiente games ela vira brilho de
  // painel: mesma cor, sem o deslocamento. É o único lugar onde a pele precisa
  // do JavaScript, porque estas duas sombras são `style` inline e CSS só as
  // alcançaria com !important sobre um seletor de atributo — frágil demais para
  // uma coisa que muda de valor a cada troca de paleta do líder.
  const surfaceShadow = useCallback(
    (color: string, px: number) =>
      isGamesPlatform || isBusinessPlatform
        ? `0 0 0 1px ${color}66, 0 18px 48px -18px ${color}`
        : `${px}px ${px}px 0 0 ${color}`,
    [isGamesPlatform, isBusinessPlatform]
  )

  const showAsLeaderEdit = canAdminister && edit
  const isPrivate = community?.privacy === "private"
  const feedLocked = isPrivate && !isMember
  const monthlyCents = Number(community?.monthly_cents || 0)

  // Os tipos que esta superfície publica, num lugar só: o "+" do headcard, o
  // convite do feed vazio e a faixa acima da lista abrem O MESMO menu. Escrever
  // a lista em cada um deles é como um tipo novo (ou uma permissão nova)
  // entraria em dois dos três, em silêncio.
  const publishItems: PublishItem[] = useMemo(
    () => [
      { kind: "post", label: t("postLabel", "Post") },
      { kind: "bee", label: t("curtoLabel", "Curto") },
      { kind: "story", label: t("beeLabel", "Bee") },
      { kind: "recado", label: t("recadoLabel", "Recado") },
    ],
    [t]
  )
  const publishBlockedMessage = isCondo
    ? t("residentToPost", "Confirme seu apartamento para publicar.")
    : t("joinToPost", "Entre na comunidade para publicar.")

  // A pilha atrás da foto. São DOIS elencos na mesma mecânica: nas comunidades
  // (comum, condomínio, bairro, pet e carro) são Perfil (azul), Mural (laranja)
  // e Ranking (roxo); na PLATAFORMA DE GAMES são Jogo atual (laranja), Posts de
  // games (verde) e Ranking (roxo). O que muda é a LISTA — a peça, a animação e
  // a conta da altura são as mesmas, e é isso que impede uma das duas telas de
  // perder um comportamento em silêncio.
  //
  // É de propósito que os pills de PAINEL não sejam blocos na página: o painel
  // é o mesmo para quem lê e para quem edita, então não há duas telas dizendo o
  // que a comunidade é, nem dois lugares mostrando o mesmo recado ou o mesmo
  // jogo atual.
  //
  // A cor é FIXA nos dois elencos, e não a `accent`: o accent é editável (pelo
  // líder na comunidade, pelo administrador na plataforma) e pode cair
  // justamente no tom do botão, que sumiria dentro do próprio card. O pill é
  // peça de chrome, não conteúdo pintável.
  /**
   * ⚠️ ABRIR O PAINEL É TRANSIÇÃO, e é aqui que mora a diferença entre esta
   * tela e as outras duas que usam a MESMA pilha.
   *
   * No perfil principal e no Financeiro os pills NAVEGAM — o clique entrega a
   * tela ao roteador e ninguém espera nada. Aqui ele muda o ESTADO DESTA
   * PÁGINA, que é um componente único de milhares de linhas: o `setPanel` de um
   * clique é atualização urgente, então o React reconstrói a árvore inteira de
   * forma SÍNCRONA e bloqueia a thread — exatamente no quadro em que o spring
   * do pill está começando.
   *
   * Passam por aqui o "Jogo atual" da plataforma de games e o Perfil/Mural
   * das outras modalidades — os três abrem painel do mesmo jeito. Os pills que
   * NAVEGAM (Posts de games, Ranking) não precisam disto: quem espera lá é o
   * roteador, não esta árvore.
   *
   * `startTransition` marca a abertura como não-urgente: o React fatia esse
   * render e devolve a thread ao navegador entre os pedaços, então a animação
   * do pill continua correndo e o painel chega alguns milissegundos depois —
   * que é a ordem certa, porque o painel nasce fora da vista, abaixo do
   * headcard, e o que a pessoa está olhando é o botão.
   *
   * ⚠️ SÓ VALE PARA ESTADO. Não envolver navegação, `fetch` ou nada assíncrono
   * aqui: o preset do headcard (`HeadcardPills`) tem `onOpen` que faz
   * requisição e acende um "indo...", e adiar aquilo esconderia o retorno do
   * clique em vez de suavizá-lo.
   */
  const openPanel = useCallback((key: CommunityPanel) => {
    startTransition(() => setPanel((p) => (p === key ? null : key)))
  }, [])

  const communityPills: PillSpec[] = useMemo(() => {
    /**
     * ⚠️ A PLATAFORMA DE GAMES TEM ELENCO PRÓPRIO — e ele NÃO é o das
     * comunidades com outra cor.
     *
     * Perfil e Mural são perguntas sobre um GRUPO (enxame, privacidade,
     * temporada, o recado do líder), e ali não há grupo: ninguém entra, todo
     * mundo lê e todo mundo publica (mig 232). O que existe para pendurar na
     * foto é a METADE PESSOAL do ambiente — o que a pessoa está jogando e os
     * posts dela — mais a fila que é DA CASA, o ranking.
     *
     * ⚠️ O RANKING SÓ TEM ESTA PORTA. O dock de games (`buildGamesItems`, em
     * components/layout/profile-sidebar.tsx) lista Feed, Estante, Jogo atual,
     * Posts games e Game — Ranking não está lá. Tirar este pill deixa
     * `/comunidades/<id>/ranking` no ar e inalcançável, que foi exatamente o
     * que aconteceu entre a limpeza de 2026-09-09 e esta reconstrução.
     *
     * ⚠️ UM ABRE PAINEL, DOIS NAVEGAM, e a divisão não é gosto: o jogo atual
     * são três campos e cabe embaixo do headcard; a vitrine de posts e o pódio
     * do ranking são telas cheias, e enfiá-los aqui empurraria o feed para
     * longe — que é justamente o que os painéis vieram evitar.
     */
    if (isGamesPlatform) {
      // O @ do dono do contexto, quando se está visitando o games de alguém.
      // Só o pill que NAVEGA precisa dele: os que pedem painel já estão dentro
      // da página que carrega o contexto (a URL nem muda).
      const who = gamerOwner?.username ? encodeURIComponent(gamerOwner.username) : null
      return [
        {
          key: "game",
          icon: Gamepad2,
          label: t("gamePill", "Jogo atual"),
          // ⚠️ O ARIA DIZ DE QUEM É O JOGO, porque o pill é o MESMO nos dois
          // papéis — no games de outra pessoa ele abre o jogo DELA, em
          // leitura. Sem isto, quem usa leitor de tela ouviria "o seu jogo
          // atual" dentro da vitrine de outro.
          ariaLabel: gamerOwner
            ? t("gamePillOfAria", "O jogo atual de {who}").replace("{who}", gamerOwnerLabel)
            : t("myGamePillAria", "O seu jogo atual: plataforma, título e nick"),
          bg: "#C2410C",
          bgHover: "#9A3412",
          // O MESMO painel que o item "Jogo atual" do dock pede pelo beacon —
          // um lugar só desenha o jogo. É por isso que o painel `game` desta
          // página sobreviveu à limpeza dos pills: ele nunca foi resquício
          // deste botão, é o destino dos dois.
          onOpen: () => openPanel("game"),
          active: panel === "game",
        },
        {
          key: "gameposts",
          icon: LayoutGrid,
          label: t("gamePostsPill", "Posts de games"),
          ariaLabel: gamerOwner
            ? t("gamePostsPillOfAria", "Vitrine com os posts de games de {who}").replace("{who}", gamerOwnerLabel)
            : t("myGamePostsPillAria", "Vitrine com os seus posts de games"),
          bg: "#15803D",
          bgHover: "#166F36",
          // ⚠️ NAVEGA LEVANDO O CONTEXTO. Sem o `?de=`, apertar este pill
          // dentro do games de alguém abriria os posts de QUEM OLHA enquanto a
          // tela ao redor mostra os dela — e o item "Posts games" do dock, que
          // leva o parâmetro, discordaria do botão vizinho.
          href: who ? `/comunidades/${id}/posts?de=${who}` : `/comunidades/${id}/posts`,
        },
        {
          key: "ranking",
          icon: Trophy,
          label: t("rankingPill", "Ranking"),
          // Chave PRÓPRIA, e não a `rankingPillAria` das comunidades: aquela
          // diz "da comunidade", e a plataforma não é uma — essa distinção é o
          // ponto inteiro da mig 232, e repeti-la errada num leitor de tela a
          // desfaz.
          ariaLabel: t("rankingPlatformPillAria", "Abrir o ranking da plataforma de games"),
          bg: "#7E22CE",
          bgHover: "#6B21A8",
          // ⚠️ SEM `?de=`, de propósito: a fila é DA CASA (minha cidade, meu
          // estado, horas jogadas) e mede quem está olhando. Levar o contexto
          // prometeria o ranking "do fulano", que não existe.
          href: `/comunidades/${id}/ranking`,
        },
      ]
    }

    return [
      {
        key: "profile",
        icon: UserRound,
        label: t("profilePill", "Perfil"),
        ariaLabel: t("profilePillAria", "Perfil da comunidade: enxame, privacidade, temporada e sobre"),
        bg: "#1D4ED8",
        bgHover: "#1E3A8A",
        onOpen: () => openPanel("profile"),
        active: panel === "profile",
      },
      {
        key: "mural",
        icon: Megaphone,
        label: t("muralPill", "Mural"),
        ariaLabel: t("muralPillAria", "Mural do líder: recados da comunidade"),
        bg: "#C2410C",
        bgHover: "#9A3412",
        onOpen: () => openPanel("mural"),
        active: panel === "mural",
      },
      // O terceiro é o RANKING, e ele NAVEGA em vez de abrir painel: o pódio
      // com foto grande, a lista inteira e a temporada não cabem embaixo do
      // headcard sem empurrar o feed para longe outra vez — foi para tirar
      // caixa do meio da página que os painéis nasceram. A gaveta dos números
      // continua mostrando os cinco primeiros; quem quer a tabela toda vai
      // para a página, que é uma tela só, servida por todas as modalidades.
      {
        key: "ranking",
        icon: Trophy,
        label: t("rankingPill", "Ranking"),
        ariaLabel: t("rankingPillAria", "Abrir o ranking completo da comunidade"),
        // Roxo porque a pilha já tem azul e laranja: um tom dourado ficaria
        // colado no laranja do Mural, e o accent está fora de questão (é
        // editável pelo líder e pode cair no tom do próprio botão).
        bg: "#7E22CE",
        bgHover: "#6B21A8",
        href: `/comunidades/${id}/ranking`,
      },
    ]
    // ⚠️ `gamerOwner`/`gamerOwnerLabel` VOLTARAM às dependências: só os pills
    // de games os leem, e foi por isso que eles saíram daqui na limpeza (quem
    // pegou foi o `eslint --max-warnings=0`). Sem eles, entrar no games de
    // outra pessoa deixaria o pill de Posts apontando para a vitrine de quem
    // olha até algum outro estado forçar um recálculo.
  }, [t, panel, id, isGamesPlatform, openPanel, gamerOwner, gamerOwnerLabel])

  const ranked = useMemo(
    () => [...members].sort((a, b) => Number(b.top_profile_xp || 0) - Number(a.top_profile_xp || 0)),
    [members]
  )

  const metricLabel = useCallback(
    (m: string) => m === "posts" ? t("metricPosts", "Publicações") : m === "shares" ? t("metricShares", "Compartilhamentos") : t("metricXp", "XP coletivo"),
    [t]
  )
  const scoreLabel = useCallback((m: string, r: { score: number; posts?: number; eng?: number }) => {
    if (m === "posts") return `${r.posts ?? 0}/${r.eng ?? 0}`
    if (m === "xp") return `${compact(r.score)} XP`
    return compact(r.score)
  }, [])
  const daysLeft = useCallback((ends: string | null) => {
    if (!ends) return null
    return Math.max(0, Math.ceil((new Date(ends).getTime() - Date.now()) / 86400000))
  }, [])

  const fetchGoal = useCallback(async () => {
    // /goal exige tier mínimo desde a blindagem de privacidade: em comunidade
    // privada e condomínio ele devolve 403 sem token.
    const token = getToken()
    const r = await fetch(`/api/communities/${id}/goal`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const d = await r.json().catch(() => ({}))
    setGoal(d.goal || null)
  }, [id])
  const fetchAnnouncements = useCallback(async () => {
    const token = getToken()
    const r = await fetch(`/api/communities/${id}/announcements`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const d = await r.json().catch(() => ({}))
    setAnnouncements(Array.isArray(d.announcements) ? d.announcements : [])
  }, [id])

  const fetchBees = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`/api/communities/${id}/bees`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) return
      const data = await res.json()
      setBees(Array.isArray(data.bees) ? data.bees : [])
    } catch {
      /* silencioso: a faixa some, o mural continua */
    }
  }, [id])

  const fetchPosts = useCallback(async (reset: boolean, cursor?: string | null) => {
    if (!id) return
    if (reset) setLoadingPosts(true); else setLoadingMorePosts(true)
    try {
      const sp = new URLSearchParams({ limit: "10" })
      if (!reset && cursor) sp.set("cursor", cursor)
      const token = getToken()
      const r = await fetch(`/api/communities/${id}/feed-posts?${sp.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      })
      const d = await r.json().catch(() => ({}))
      const items: FeedPost[] = Array.isArray(d.items) ? d.items : []
      setPosts((prev) => (reset ? items : [...prev, ...items]))
      setPostsCursor(d.next_cursor || null)
      setPostsHasMore(!!d.has_more)
    } finally {
      if (reset) setLoadingPosts(false); else setLoadingMorePosts(false)
    }
  }, [id])

  const loadAll = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const tk = getToken()
      const authHeaders = tk ? { Authorization: `Bearer ${tk}` } : undefined
      const [cRes, mRes, gRes, aRes, bmRes] = await Promise.all([
        // Todas com token: desde a blindagem de privacidade, members/goal/
        // benchmark exigem tier mínimo em comunidade privada e condomínio.
        fetch(`/api/communities/${id}`, authHeaders ? { headers: authHeaders } : undefined),
        fetch(`/api/communities/${id}/members`, authHeaders ? { headers: authHeaders } : undefined),
        fetch(`/api/communities/${id}/goal`, authHeaders ? { headers: authHeaders } : undefined),
        fetch(`/api/communities/${id}/announcements`, authHeaders ? { headers: authHeaders } : undefined),
        fetch(`/api/communities/${id}/benchmark`, authHeaders ? { headers: authHeaders } : undefined),
      ])
      const cData = await cRes.json()
      if (!cRes.ok) throw new Error(cData.error || t("notFound", "Comunidade não encontrada."))
      const c: Community = cData.community
      setCommunity(c)
      if (!seeded.current) {
        setNameDraft(c.display_name)
        setBioDraft(c.bio || "")
        setAccentDraft(c.community_theme?.accent || "gold")
        // Ausente = preto, que é o padrão da plataforma de negócio. Comunidade
        // que nunca escolheu nasce preta, e não com a cor da última que passou.
        setBgDraft(c.community_theme?.background || "black")
        seeded.current = true
      }
      setPrivacyDraft(c.privacy === "private" ? "private" : "public")
      if (c.monthly_cents) setMonthlyDraft((Number(c.monthly_cents) / 100).toFixed(2).replace(".", ","))
      const mData = await mRes.json(); setMembers(Array.isArray(mData.members) ? mData.members : [])
      const gData = await gRes.json(); setGoal(gData.goal || null)
      const aData = await aRes.json(); setAnnouncements(Array.isArray(aData.announcements) ? aData.announcements : [])
      const bmData = await bmRes.json(); setBenchmark(bmData.benchmark || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t("notFound", "Comunidade não encontrada."))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => { loadAll() }, [loadAll])
  useEffect(() => { fetchPosts(true) }, [fetchPosts])
  useEffect(() => { fetchBees() }, [fetchBees])
  useEffect(() => {
    // ⚠️ SÓ O LÍDER CAI DIRETO NA EDIÇÃO — o admin da plataforma, não. A
    // comunidade é do líder e ele entra nela para cuidar dela; a plataforma o
    // admin abre como qualquer um, e liga a edição quando quer mexer.
    if (isLeader && !autoEdited.current) { setEdit(true); autoEdited.current = true }
  }, [isLeader])

  // Enxame atual da comunidade comum, para o select nascer no que já vale.
  useEffect(() => {
    setMachineDraft(community?.id_machine ? String(community.id_machine) : "")
  }, [community?.id_machine])

  // A lista de enxames só desce para quem ESTÁ editando uma comunidade comum:
  // visitante não precisa dos 15 enxames para ler o mural, e as modalidades da
  // mig 210 (pet/carro/games) e as territoriais não têm enxame nenhum.
  useEffect(() => {
    if (!showAsLeaderEdit || (community?.kind ?? "common") !== "common") return
    if (enxames.length) return
    fetch("/api/enxames")
      .then((r) => r.json())
      .then((d) => setEnxames(Array.isArray(d?.enxames) ? d.enxames : []))
      .catch(() => setEnxames([]))
  }, [showAsLeaderEdit, community?.kind, enxames.length])

  // ─── Assunto: carrega o que já está escolhido e as listas de escolha ──────
  // Só para o líder em edição: um visitante não precisa baixar 300 modelos de
  // carro para ler o mural.
  useEffect(() => {
    const sub = community?.subject
    if (!sub) return
    if (sub.kind === "pet") {
      setPetDraft({
        species: sub.species || "",
        breed_slug: "",
        breed_label: sub.breed_label || "",
        birth_year: sub.birth_year ? String(sub.birth_year) : "",
      })
    } else if (sub.kind === "car") {
      setCarDraft({ brand_code: sub.brand_code || "", model_code: sub.model_code || "" })
    }
  }, [community?.subject])

  /**
   * ⚠️ QUEM É O DONO DO RECORTE — lido do WINDOW, UMA vez.
   *
   * `useSearchParams` obriga Suspense e tira a rota do pré-render (o build já
   * quebrou exatamente assim com `?tipo=condo`), e reler a cada render faria a
   * página voltar ao contexto de origem sempre que qualquer estado mudasse.
   *
   * Uma requisição resolve as três coisas de que a tela precisa: quem é a
   * pessoa (para o cabeçalho), o que ela joga, e o `id_user` — que é o que a
   * estante e a vitrine de posts usam depois. Endereçado por @username porque
   * é o que cabe numa URL que alguém manda por mensagem.
   *
   * Falhou (perfil apagado, @ trocado, flag desligada)? Fica em `null` e a
   * plataforma abre no recorte de quem olha. Uma tela de erro aqui trocaria um
   * contexto perdido por uma parede — e a plataforma continua inteira sem ele.
   */
  /**
   * O rosto de quem olha. Só as PLATAFORMAS o usam (games sempre; o negócio
   * como reserva de quem nunca subiu logo), então quem abre um condomínio ou o
   * perfil de um pet não paga a requisição.
   *
   * Sem sessão não há o que buscar, e a ausência é o estado correto: o
   * visitante anônimo vê a plataforma inteira, só não vê um rosto que não
   * existe.
   */
  useEffect(() => {
    if (!isGamesPlatform && !isBusinessPlatform) return
    const token = getToken()
    if (!token) { setMyAvatar(null); return }
    let alive = true
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return
        setMyAvatar(data?.avatar || null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isGamesPlatform, isBusinessPlatform])

  const ctxDone = useRef(false)
  useEffect(() => {
    if (!isGamesPlatform || ctxDone.current) return
    ctxDone.current = true
    const who = new URLSearchParams(window.location.search).get("de")
    if (!who) return
    const token = getToken()
    if (!token) return
    let alive = true
    fetch(`/api/gamer/profile/${encodeURIComponent(who.replace(/^@/, ""))}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.owner?.id_user) return
        setGamesCtx(data)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isGamesPlatform])

  // ⚠️ É O ÚNICO PEDIDO DA PÁGINA QUE NÃO DEPENDE DE EDIÇÃO: o jogo atual é
  // conteúdo (o que a pessoa joga). SEM contexto ele é o de quem olha; com
  // contexto de OUTRA pessoa ele já veio junto do cabeçalho, e buscá-lo de
  // novo aqui traria o de quem olha por cima do dela — o bug clássico de duas
  // fontes para o mesmo campo. Sem sessão não há o que buscar (rota autenticada).
  useEffect(() => {
    if (!isGamesPlatform || !currentUserId) { setMyGame(null); return }
    if (gamesCtx && !gamesCtx.is_me) { setMyGame(gamesCtx.subject); return }
    const token = getToken()
    if (!token) return
    let alive = true
    fetch("/api/games/current", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return
        const sub = data?.subject || null
        setMyGame(sub)
        setGameDraft({
          platform: sub?.platform || "",
          game_title: sub?.game_title || "",
          gamertag: sub?.gamertag || "",
        })
      })
      .catch(() => {})
    return () => { alive = false }
  }, [isGamesPlatform, currentUserId, gamesCtx])

  useEffect(() => {
    if (!showAsLeaderEdit || subjectKind !== "pet") return
    const token = getToken()
    if (!token) return
    const species = petDraft.species || "dog"
    fetch(`/api/pets/breeds?species=${species}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setBreeds(Array.isArray(d.breeds) ? d.breeds : []))
      .catch(() => setBreeds([]))
  }, [showAsLeaderEdit, subjectKind, petDraft.species])

  useEffect(() => {
    if (!showAsLeaderEdit || subjectKind !== "car") return
    const token = getToken()
    if (!token) return
    fetch("/api/cars/brands", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setCarBrands(Array.isArray(d.brands) ? d.brands : []))
      .catch(() => setCarBrands([]))
  }, [showAsLeaderEdit, subjectKind])

  useEffect(() => {
    if (!showAsLeaderEdit || subjectKind !== "car" || !carDraft.brand_code) {
      setCarModels([])
      return
    }
    const token = getToken()
    if (!token) return
    fetch(`/api/cars/brands/${encodeURIComponent(carDraft.brand_code)}/models`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setCarModels(Array.isArray(d.models) ? d.models : []))
      .catch(() => setCarModels([]))
  }, [showAsLeaderEdit, subjectKind, carDraft.brand_code])

  // Comunidade privada: cria o checkout da assinatura mensal e redireciona.
  const startMembershipCheckout = useCallback(async () => {
    const token = getToken()
    if (!token) { setActionMsg(t("loginToJoin", "Entre para participar")); return }
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/membership/checkout`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.checkout_url) throw new Error(data.error || t("subscribeError", "Não foi possível iniciar a assinatura."))
      window.location.href = data.checkout_url
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("subscribeError", "Não foi possível iniciar a assinatura."))
      setBusy(false)
    }
  }, [id, t])

  const joinOrLeave = async (action: "join" | "leave") => {
    const token = getToken()
    if (!token) { setActionMsg(t("loginToJoin", "Entre para participar")); return }
    setBusy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/${action}`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      // Comunidade privada: o join devolve requires_payment → vai pro checkout.
      if (action === "join" && data?.requires_payment) {
        await startMembershipCheckout()
        return
      }
      if (!res.ok) throw new Error(data.error || t("joinError", "Não foi possível entrar."))
      setActionMsg(action === "join" ? t("joinSuccess", "Você entrou na comunidade!") : t("leaveSuccess", "Você saiu da comunidade."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("joinError", "Não foi possível entrar."))
    } finally { setBusy(false) }
  }

  // Volta do checkout da assinatura (?assinatura=sucesso).
  useEffect(() => {
    if (typeof window === "undefined") return
    const sp = new URLSearchParams(window.location.search)
    const st = sp.get("assinatura")
    if (!st) return
    if (st === "sucesso") setActionMsg(t("subscribeSuccess", "Assinatura confirmada! Bem-vindo(a) à comunidade."))
    else if (st === "cancelada") setActionMsg(t("subscribeCanceled", "Assinatura cancelada — você não foi cobrado."))
    window.history.replaceState({}, "", window.location.pathname)
  }, [t])

  // Privacidade (líder): salvar público/privado + mensalidade.
  const savePrivacy = async () => {
    const token = getToken()
    if (!token) return
    let monthly_cents: number | undefined
    if (privacyDraft === "private") {
      monthly_cents = Math.round(Number(monthlyDraft.replace(/\./g, "").replace(",", ".")) * 100)
      if (!Number.isFinite(monthly_cents) || monthly_cents <= 0) {
        setActionMsg(t("privacyPriceInvalid", "Informe o valor da mensalidade."))
        return
      }
    }
    setSavingPrivacy(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/privacy`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ privacy: privacyDraft, ...(monthly_cents ? { monthly_cents } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("saveError", "Não foi possível salvar."))
      setActionMsg(privacyDraft === "private" ? t("privacySavedPrivate", "Comunidade agora é privada.") : t("privacySavedPublic", "Comunidade agora é pública."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSavingPrivacy(false) }
  }

  // Resumo das mensalidades (líder de comunidade privada).
  useEffect(() => {
    if (!isLeader || !isPrivate || !id) { setMembershipSummary(null); return }
    const token = getToken()
    if (!token) return
    fetch(`/api/communities/${id}/membership/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setMembershipSummary(d.summary || null))
      .catch(() => setMembershipSummary(null))
  }, [isLeader, isPrivate, id])

  const uploadImage = async (kind: "banner" | "avatar", file: File) => {
    const token = getToken()
    if (!token) return
    const localUrl = URL.createObjectURL(file)
    if (kind === "banner") setBannerPreview(localUrl); else setAvatarPreview(localUrl)
    setUploading(kind); setActionMsg(null)
    try {
      const fd = new FormData(); fd.append(kind, file)
      const res = await fetch(`/api/communities/${id}/${kind}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("uploadError", "Não foi possível enviar a imagem."))
      await loadAll()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("uploadError", "Não foi possível enviar a imagem."))
    } finally {
      setUploading(null)
      if (kind === "banner") setBannerPreview(null); else setAvatarPreview(null)
      URL.revokeObjectURL(localUrl)
    }
  }

  /**
   * Grava o MEU jogo atual.
   *
   * ⚠️ BOTÃO PRÓPRIO, e não o "Salvar" lá de cima: aquele é do administrador
   * da plataforma (nome, foto, cores) e um usuário comum nem o enxerga. Juntar
   * os dois faria a única coisa que é DELE dentro do ambiente depender de uma
   * permissão que ele não tem.
   */
  const saveMyGame = async () => {
    const token = getToken()
    if (!token || savingGame) return
    setSavingGame(true)
    try {
      const res = await fetch("/api/games/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          platform: gameDraft.platform || null,
          game_title: gameDraft.game_title || null,
          gamertag: gameDraft.gamertag || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || t("saveError", "Não foi possível salvar."))
      setMyGame(data?.subject || null)
      setActionMsg(t("gameSaved", "Jogo atualizado."))
      setTimeout(() => setActionMsg(null), 2500)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally {
      setSavingGame(false)
    }
  }

  const saveAll = async () => {
    const token = getToken()
    if (!token || !community) return
    if (!nameDraft.trim()) { setActionMsg(t("saveError", "Não foi possível salvar.")); return }
    setSaving(true); setActionMsg(null)
    try {
      const pRes = await fetch(`/api/communities/${id}/profile`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // O enxame entra no mesmo PATCH: para quem edita, nome, bio e enxame
        // são a mesma tarefa. Só vai quando a modalidade tem enxame — nas
        // outras o backend recusa o campo de propósito (mig 219).
        body: JSON.stringify({
          display_name: nameDraft.trim(),
          bio: bioDraft.trim() || null,
          ...((community.kind ?? "common") === "common"
            ? { id_machine: machineDraft ? Number(machineDraft) : null }
            : {}),
        }),
      })
      const pData = await pRes.json()
      if (!pRes.ok) throw new Error(pData.error || t("saveError", "Não foi possível salvar."))
      // ⚠️ AS DUAS CORES VÃO NO MESMO PATCH, e a condição pergunta pelas duas:
      // separadas, mudar só o fundo não gravaria nada (a comparação era só do
      // accent) e o líder veria a cor voltar sozinha no próximo F5.
      const themeChanged =
        (community.community_theme?.accent || "gold") !== accentDraft ||
        (community.community_theme?.background || "black") !== bgDraft
      if (themeChanged) {
        const tRes = await fetch(`/api/communities/${id}/theme`, {
          method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            theme: { ...(community.community_theme || {}), accent: accentDraft, background: bgDraft },
          }),
        })
        const tData = await tRes.json()
        if (!tRes.ok) throw new Error(tData.error || t("saveError", "Não foi possível salvar."))
      }
      // Assunto (pet/carro): vai junto do Salvar, e não num botão só dele —
      // para quem edita, nome, foto e raça são a mesma tarefa.
      //
      // ⚠️ GAMES SAIU DAQUI (mig 232): o jogo atual é da PESSOA e tem o botão
      // dele dentro do painel. Mandá-lo neste Salvar faria a edição de quem
      // não é admin depender de um botão que ele não vê.
      if (subjectKind && subjectKind !== "games") {
        const base = subjectKind === "pet" ? "pets" : "cars"
        const body =
          subjectKind === "pet"
            ? {
                species: petDraft.species || null,
                breed_slug: petDraft.breed_slug || null,
                breed_label: petDraft.breed_label || null,
                birth_year: petDraft.birth_year || null,
              }
            : {
                  brand_code: carDraft.brand_code || null,
                  brand_label: carBrands.find((b) => b.code === carDraft.brand_code)?.label || null,
                  model_code: carDraft.model_code || null,
                  model_label: carModels.find((m) => m.code === carDraft.model_code)?.label || null,
                }
        // Carro sem modelo escolhido ainda: não manda nada em vez de tomar 400.
        const skip = subjectKind === "car" && (!carDraft.brand_code || !carDraft.model_code)
        if (!skip) {
          const sRes = await fetch(`/api/${base}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(body),
          })
          const sData = await sRes.json()
          if (!sRes.ok) {
            // 409 = esse modelo já tem comunidade. O erro aponta qual, para a
            // pessoa poder ir até ela em vez de ficar tentando.
            throw new Error(
              sData.existing_community
                ? `${sData.error} (${sData.existing_community.display_name})`
                : sData.error || t("saveError", "Não foi possível salvar."),
            )
          }
        }
      }
      setActionMsg(t("profileSaved", "Alterações salvas!"))
      await loadAll()
      setTimeout(() => setActionMsg(null), 2500)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSaving(false) }
  }

  // Temporada (meta)
  const openGoalForm = () => {
    setGoalTitle(goal?.title || ""); setGoalMetric(goal?.metric || "xp")
    setGoalDays(30); setGoalFormOpen(true)
  }
  const saveGoal = async () => {
    const token = getToken()
    if (!token) return
    if (!goalTitle.trim()) { setActionMsg(t("goalInvalid", "Dê um nome para a temporada.")); return }
    setSavingGoal(true); setActionMsg(null)
    try {
      const ends_at = new Date(Date.now() + goalDays * 86400000).toISOString()
      const res = await fetch(`/api/communities/${id}/goal`, {
        method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: goalTitle.trim(), metric: goalMetric, ends_at }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("saveError", "Não foi possível salvar."))
      setGoalFormOpen(false); await fetchGoal()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setSavingGoal(false) }
  }
  const removeGoal = async () => {
    const token = getToken()
    if (!token) return
    await fetch(`/api/communities/${id}/goal`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    setGoalFormOpen(false); await fetchGoal()
  }

  // Mural
  const postAnnouncement = async () => {
    const token = getToken()
    if (!token || !annBody.trim()) return
    setPostingAnn(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/announcements`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: annBody.trim(), is_pinned: annPin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("saveError", "Não foi possível salvar."))
      setAnnBody(""); setAnnPin(false); await fetchAnnouncements()
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("saveError", "Não foi possível salvar."))
    } finally { setPostingAnn(false) }
  }
  const deleteAnnouncement = async (annId: number) => {
    const token = getToken()
    if (!token) return
    await fetch(`/api/communities/${id}/announcements/${annId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    await fetchAnnouncements()
  }

  // No condomínio quem escreve é o MORADOR, não o membro — por isso o guard é
  // `canPost` e não `isMember`.
  const denyPost = () => setActionMsg(isCondo
    ? t("residentToPost", "Confirme seu apartamento para publicar.")
    : t("joinToPost", "Entre na comunidade para publicar."))

  const openComposer = (kind: "post" | "bee" | "story") => {
    if (!canPost) { denyPost(); return }
    setComposerKind(kind); setComposerOpen(true)
  }
  const openRecado = () => {
    if (!canPost) { denyPost(); return }
    setRecadoBody(""); setRecadoOpen(true)
  }
  const postRecado = async () => {
    const token = getToken()
    const text = recadoBody.trim()
    if (!token || !text) return
    setPostingRecado(true); setActionMsg(null)
    try {
      const res = await fetch(`/api/communities/${id}/recado`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("recadoError", "Não foi possível publicar o recado."))
      setRecadoOpen(false); setRecadoBody(""); await fetchPosts(true)
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : t("recadoError", "Não foi possível publicar o recado."))
    } finally { setPostingRecado(false) }
  }
  // ⚠️ OS TRÊS HANDLERS DO CARD DO FEED MORAM EM `useCallback`, e isso é
  // requisito do `memo` do `PortfolioPostCard` — não é estilo. Escritos como
  // arrow inline no JSX, eles nascem novos a cada render desta página e
  // derrubam a comparação do memo sozinhos: cada clique num pill voltaria a
  // reconstruir a lista inteira de posts, que é exatamente o engasgo que o
  // memo existe para fechar. Prop de função nova para o card entra aqui.
  const deleteRecado = useCallback(async (recadoId: number) => {
    const token = getToken()
    if (!token) return
    setPosts((prev) => prev.filter((p) => !(p.is_recado && p.recado_id === recadoId)))
    try {
      await fetch(`/api/communities/${id}/recado/${recadoId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    } catch { /* já removido otimisticamente */ }
  }, [id])

  const openPostComments = useCallback((pid: string) => setOpenCommentsFor(pid), [])

  const handleLikeChange = useCallback((pid: string, liked: boolean, likes_count: number | null) => {
    setPosts((prev) => prev.map((p) => p.post_id === pid ? { ...p, viewer_has_liked: liked, likes_count: likes_count ?? p.likes_count } : p))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0b0804] text-sm font-bold uppercase tracking-[0.14em] text-[#9A938A]">
        {t("pageTitle", "Comunidades")}…
      </div>
    )
  }
  if (error || !community) {
    return (
      <div className="min-h-[100dvh] bg-[#0b0804]">
        <div className="mx-auto max-w-md px-5 py-24 text-center">
          <p className="fl-display text-2xl text-[#F5F1E8]">{t("notFound", "Comunidade não encontrada.")}</p>
          <Link href="/account" className="mt-4 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-[#F2B705]">
            <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
          </Link>
        </div>
      </div>
    )
  }

  const bannerSrc = bannerPreview || community.banner_url
  /**
   * ⚠️ A FOTO DO HEADCARD É A DA PESSOA (pedido do Alex, 2026-09-09: "todas as
   * heads trazem a foto do perfil"), e são TRÊS regimes:
   *
   *  1. VISITANDO o games de alguém → a foto DELE. O rosto diz de quem é o
   *     recorte que está na tela.
   *  2. PLATAFORMA (games) → a foto de QUEM OLHA. A foto da casa é do admin e
   *     não diz nada sobre o recorte pessoal que a tela mostra; um avatar
   *     institucional ali faria a plataforma parecer de outra pessoa. É a
   *     mesma escolha que o Financeiro já fazia desde sempre.
   *  3. COMUNIDADE (negócio e as outras) → a foto DELA, com a do usuário como
   *     RESERVA. A comunidade de negócio tem logo próprio e o líder pode
   *     trocá-lo; forçar a foto dele apagaria a marca da barbearia. O que a
   *     reserva resolve é o boneco cinza de quem nunca subiu imagem.
   *
   * ⚠️ A RESERVA É SÓ DO NEGÓCIO, e não de toda comunidade: em pet, carro,
   * condomínio e bairro a foto é do ASSUNTO — pôr a cara do dono no perfil do
   * cachorro seria afirmar que o cachorro é ele.
   *
   * O BANNER e as CORES ficam de fora dos três: são a identidade do ambiente,
   * e trocá-los por pessoa faria a plataforma parecer sete plataformas.
   */
  const avatarSrc = gamerOwner
    ? gamerOwner.avatar_url || null
    : isGamesPlatform
      ? myAvatar
      : avatarPreview || community.avatar_url || (isBusinessPlatform ? myAvatar : null)

  /** O rosto desta tela é o de uma PESSOA? Decide só o que aparece quando não
   *  há foto — ver a nota no fallback, junto do `<img>`. */
  const faceIsPerson = !!gamerOwner || isGamesPlatform

  // Ranking exibido: o da temporada (por métrica) quando há meta; senão XP absoluto.
  const seasonOn = !!goal
  const rankRows = goal
    ? goal.ranking.map((r) => ({ id_user: r.id_user, name: r.name, avatar_url: r.avatar_url, score: r.score, posts: r.posts, eng: r.eng }))
    : ranked.map((m) => ({ id_user: m.id_user, name: m.top_profile_name || m.user_name, avatar_url: m.top_profile_avatar, score: Number(m.top_profile_xp || 0), posts: undefined as number | undefined, eng: undefined as number | undefined }))
  const topRow = goal && goal.status === "closed" && goal.winner
    ? { id_user: goal.winner.id_user, name: goal.winner.name, avatar_url: goal.winner.avatar_url, score: goal.winner.score, posts: undefined as number | undefined, eng: undefined as number | undefined }
    : rankRows[0]
  const rowScore = (row: { score: number; posts?: number; eng?: number }) =>
    seasonOn && goal ? scoreLabel(goal.metric, row) : compact(row.score)

  return (
    // A pele é uma CLASSE no container (`fl-games`/`fl-business`, em
    // globals.css) e não uma troca de cores no arquivo: esta página é uma casca
    // só para sete modalidades, e mexer nas cores aqui pintaria todas elas.
    // As variáveis do `style` só existem na de negócio, onde a cor é do líder.
    <div
      style={skinVars}
      className={`relative min-h-[100dvh] overflow-hidden bg-[#0b0804] text-[#F5F1E8] ${isGamesPlatform ? "fl-games" : isBusinessPlatform ? "fl-business" : ""} ${showAsLeaderEdit ? "pb-28" : "pb-20"}`}
    >
      {/* O fundo é o PRIMEIRO filho: sem z-index nenhum, tudo que vem depois no
          DOM pinta por cima dele — a mesma ordem de pintura que faz a foto do
          headcard cobrir a pilha de pills. */}
      {isGamesPlatform && <TechBackdrop />}
      {/* O mesmo fundo da plataforma de games, na cor que o líder escolheu —
          e SEM símbolo nenhum por cima (o cifrão é do Financeiro; "meu
          negócio" pode ser barbearia ou marcenaria, e um símbolo escolhido por
          nós estaria errado para quase todos). */}
      {isBusinessPlatform && <TechBackdrop variant="business" tint={bizTint} />}
      {/* Declara o ambiente para o dock global (não desenha nada).
          "Meus negócios" (a comunidade `common`) é ambiente pelo mesmo motivo
          que a plataforma de games: lá dentro a barra da Freelandoo dá lugar aos
          controles do espaço, e a volta é a foto amarela.
          ⚠️ O ambiente é do LUGAR, não de quem olha — quem visita também troca
          de barra, e é por isso que a porta de saída existe. O que depende de
          quem olha é só o item do Site (`showSiteEntry`, que some junto da
          aba quando o líder aperta "Ver como público"). */}
      {shellKind && (
        <CommunityShellBeacon
          communityId={id}
          kind={shellKind}
          canBuildSite={showSiteEntry}
          // O dock precisa saber em QUE recorte a tela está: o item "Posts
          // games" é o único que navega, e sem o contexto ele sairia para os
          // posts de quem olha.
          gamerContext={gamerOwner?.username ?? null}
        />
      )}
      {/* Top bar */}
      <div className="relative z-10 mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 pt-6 md:px-10">
        {/* ⚠️ VOLTA PARA O PERFIL, não para a vitrine (pedido do Alex,
            2026-09-08): `/comunidades` ficou órfã, e um "Voltar" apontando para
            uma página que já não tem porta de entrada seria a única forma de
            chegar nela — o oposto de orfanar. A comunidade é uma sala DO
            PERFIL, e é para ele que se volta. */}
        <Link href="/account" className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#9A938A] transition hover:text-[#F5F1E8]">
          <ArrowLeft className="h-4 w-4" /> {t("back", "Voltar")}
        </Link>
        {/* ⚠️ A SAÍDA DO CONTEXTO. Sem ela quem entra no games de alguém fica
            preso nele: o "Voltar" leva ao perfil, e o pill roxo do headcard
            está a duas telas de distância. É a MESMA página, sem o `?de=` —
            uma navegação de verdade (e não replaceState) porque o contexto é
            lido uma vez, na montagem. */}
        {gamerOwner && (
          <Link
            href={`/comunidades/${id}`}
            className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]"
          >
            <Gamepad2 className="h-4 w-4" style={{ color: accent }} />
            {t("backToMyGames", "Ver o meu games")}
          </Link>
        )}
        {canAdminister && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {edit && (
              <div className="inline-flex flex-wrap items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-2.5 py-1.5">
                <Palette className="h-4 w-4" style={{ color: accent }} />
                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]">{t("colorsLabel", "Cores")}</span>
                <span className="h-5 w-5 border-2 border-[#0B0B0D]" style={{ background: accent }} />
                <select value={accentDraft} onChange={(e) => setAccentDraft(e.target.value)}
                  className="border-l-2 border-[#F5F1E8]/15 bg-transparent pl-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] outline-none [&_option]:bg-[#15120E]">
                  {ACCENTS.map((a) => <option key={a.key} value={a.key}>{t(a.labelKey, a.fallback)}</option>)}
                </select>
                {/* ⚠️ O FUNDO SÓ APARECE NA PLATAFORMA DE NEGÓCIO, que é a
                    única com pele de cor variável: nas outras modalidades o
                    seletor pediria uma escolha que a tela não sabe obedecer. */}
                {isBusinessPlatform && (
                  <>
                    <span className="border-l-2 border-[#F5F1E8]/15 pl-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">
                      {t("bgLabel", "Fundo")}
                    </span>
                    <span className="h-5 w-5 border-2 border-[#0B0B0D]" style={{ background: bizTint.canvas, boxShadow: `inset 0 0 0 2px ${bizTint.glow}55` }} />
                    <select value={bgDraft} onChange={(e) => setBgDraft(e.target.value)}
                      className="bg-transparent text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] outline-none [&_option]:bg-[#15120E]">
                      {BACKDROPS.map((b) => <option key={b.key} value={b.key}>{t(b.labelKey, b.fallback)}</option>)}
                    </select>
                  </>
                )}
              </div>
            )}
            <button type="button" onClick={() => setEdit((e) => !e)}
              className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]">
              {edit ? <><Eye className="h-4 w-4" /> {t("viewPublic", "Ver como público")}</> : <><ScrollText className="h-4 w-4" /> {t("edit", "Editar")}</>}
            </button>
          </div>
        )}
      </div>

      {/* HERO */}
      <header className="relative mx-auto mt-4 max-w-5xl px-5 md:px-10">
        {/* ⚠️ `z-0` NÃO é decoração: é o que TRANCA o banner debaixo da linha da
            foto. Sem ele o banner é `relative` com z-index AUTO, e elemento
            posicionado com z auto NÃO cria contexto de empilhamento — então o
            `z-30` do overlay de "Trocar capa" (ImageDrop) subia para o contexto
            do <header> e ganhava do `z-20` da linha da foto, pintando meio card
            da foto e os pills de preto 50% (o `overflow-hidden` daqui é que
            recortava a mancha na borda do banner, dando o efeito de "metade
            escura"). Com o z-0 o banner vira contexto próprio: tudo que estiver
            dentro dele — chip, gradiente, overlay de upload e o que vier depois
            — fica abaixo da linha da foto por construção. */}
        <div className="relative z-0 overflow-hidden border-2 border-[#0B0B0D]" style={{ boxShadow: surfaceShadow(accent, 8) }}>
          <div className="relative h-44 md:h-56 bg-[#1D1810]">
            {bannerSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={bannerSrc} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90" />
            )}
            <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 40%, #0b0804cc 100%)` }} />
            {showAsLeaderEdit && <ImageDrop label={t("changeBanner", "Trocar capa")} busy={uploading === "banner"} onFile={(f) => uploadImage("banner", f)} />}
            {community.enxame_name && (
              <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
                {tx.enxame(null, community.enxame_name)}
              </span>
            )}
            {/* Pet, carro e games não têm enxame (mig 210): o chip do lugar dele
                é o ASSUNTO — raça, modelo, jogo. */}
            {subjectChip && (
              <span className="absolute left-4 top-4 z-20 -rotate-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#0B0B0D]">
                {subjectChip}
              </span>
            )}
            {isPrivate && (
              <span className="absolute left-4 top-12 z-20 inline-flex -rotate-2 items-center gap-1 border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#F5F1E8]">
                <Lock className="h-3 w-3" style={{ color: accent }} /> {t("privateBadge", "Privada")}
                {monthlyCents > 0 && <span style={{ color: accent }}>· {fmtBRL(monthlyCents)}/{t("perMonthShort", "mês")}</span>}
              </span>
            )}
            <span className="absolute right-4 top-4 z-20 flex h-14 min-w-14 flex-col items-center justify-center border-2 border-[#0B0B0D] bg-[#15120E] px-2">
              <span className="text-[8px] font-bold uppercase text-[#9A938A]">{t("level", "Nível")}</span>
              <span className="fl-display text-2xl leading-none" style={{ color: accent }}>{community.xp_level ?? "—"}</span>
            </span>
          </div>
        </div>

        {/* ⚠️ O RECUO ACOMPANHOU A PROPORÇÃO. A foto era QUADRADA (128px) e
            mordia o banner em 48px; agora ela é 2/3 como a do perfil (192px no
            celular, 216px no md) e o recuo é ~METADE da altura dela, que é a
            regra do headcard principal: metade sobre o banner, metade sobre o
            papel. Mantido o -mt-12 antigo, os 64px a mais cairiam todos para
            baixo — a foto desgrudaria do banner e empurraria o título e o "+"
            junto com ela. */}
        <div className="relative z-20 -mt-24 flex flex-wrap items-end gap-4 px-2 md:-mt-[108px] md:px-3">
          {/* A COLUNA DA FOTO: a pilha é o PRIMEIRO filho e a foto vem depois
              no DOM. Sem z-index em nenhum dos dois, quem pinta por último
              cobre — é assim que a foto esconde o corpo do botão e só o ícone
              escapa pela direita. (`-z-10` NÃO serve: aqui o contexto de
              empilhamento mais próximo é esta linha `relative z-20`, e o botão
              iria parar atrás do banner.)

              A pilha fica FORA da caixa da foto porque aquela caixa é
              `overflow-hidden` — lá dentro o botão seria recortado na borda.

              `pl-32 md:pl-36` casa com a LARGURA DA FOTO (w-32 / md:w-36 —
              a altura sai da proporção 2/3 e não entra nesta conta).
              Mexeu no tamanho da foto? Ajustar o padding junto, senão o corpo
              colorido nasce ao lado dela em vez de debaixo.

              E a foto tem que ser MAIOR QUE A PILHA, senão o pill de cima e o
              de baixo escapam por cima e por baixo em vez de só pela direita:
              com três pills a pilha mede 3 × 36 (h-9) + 2 × 6 (gap-1.5) =
              120px. Com a proporção 2/3 a foto tem 192px de altura (216 no md)
              e a folga é confortável — mas ela veio de h-32 (128px), que já era
              o mínimo. PILL NOVO AQUI? Refazer esta conta. */}
          <div className="relative shrink-0">
            {/* ⚠️ A PILHA VALE PARA TODAS AS MODALIDADES, GAMES INCLUSIVE, e o
                que muda entre elas é só a LISTA (ver `communityPills`), nunca a
                mecânica: em games são Jogo atual (laranja, abre painel), Posts
                de games (verde, navega) e Ranking (roxo, navega); nas outras,
                Perfil, Mural e Ranking.

                Não há gate de montagem aqui de propósito — `PillStack` já
                devolve `null` com a lista vazia. Um `&&` neste ponto seria uma
                SEGUNDA decisão sobre quais telas têm pilha, e a que ficasse
                para trás apagaria botões que a lista continuou entregando (foi
                o que aconteceu com os três de games entre 2026-09-09 e esta
                reconstrução).

                ⚠️ O RANKING DE GAMES SÓ TEM ESTA PORTA: o dock de lá não o
                lista, então tirar o pill deixa `/comunidades/<id>/ranking` no
                ar e inalcançável. */}
            <PillStack
              pills={communityPills}
              avatarPadClass="pl-32 md:pl-36"
              className="absolute left-0 top-1/2 -translate-y-1/2"
            />
            {/* ⚠️ PROPORÇÃO 2/3, A MESMA DO HEADCARD DO PERFIL (pedido do Alex:
                "deixa todos os cards das fotos na mesma proporção do
                principal"). A LARGURA não mudou (w-32/w-36), e é por isso que
                o `pl-32 md:pl-36` da pilha continua valendo — o padding casa
                com a largura, não com a altura. A altura subiu de 128 para
                192px, o que só melhora a cobertura da pilha (120px). */}
            <div className="relative aspect-[2/3] w-32 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810] md:w-36" style={{ outline: `2px solid ${accent}`, outlineOffset: "2px" }}>
              {/* ⚠️ SEM FOTO, O FALLBACK DEPENDE DE QUEM É O ROSTO — e é por
                  isso que ele não é um só. Quando a foto que falta é a de uma
                  PESSOA (a plataforma, onde o rosto é o de quem olha, ou o
                  games de alguém que se está visitando), valem as INICIAIS
                  dela, exatamente como a Carteira já fazia: as duas telas têm
                  a mesma silhueta de propósito, e um boneco cinza genérico num
                  lado e iniciais no outro era a divergência que fazia a
                  plataforma parecer quebrada. Quando o que falta é a foto de
                  uma COMUNIDADE — o logo da barbearia, o retrato do cachorro —
                  o boneco continua, porque ali não há nome de pessoa para
                  reduzir a duas letras. */}
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt={gamerOwner ? gamerOwnerLabel : community.display_name} className="h-full w-full object-cover" />
              ) : faceIsPerson ? (
                <span className="grid h-full w-full place-items-center fl-display text-4xl text-[#F5F1E8]/40">
                  {initialsOf(gamerOwner ? gamerOwnerLabel : storedUser?.nome)}
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/placeholder-user.jpg" alt={community.display_name} className="h-full w-full object-cover" />
              )}
              {/* ⚠️ NA PLATAFORMA DE GAMES NÃO HÁ "TROCAR FOTO", e isso é
                  consequência direta de a foto ser a da PESSOA: o admin
                  trocaria a foto da casa, gravaria, e não veria mudança
                  nenhuma — porque a tela mostra a de quem está olhando. Botão
                  que aceita o clique e não muda nada é o pior tipo de porta.
                  Quem quiser outra imagem ali troca a foto do próprio perfil.
                  No NEGÓCIO ele fica: lá a foto da comunidade continua sendo a
                  que manda (o logo), e a do usuário é só a reserva. */}
              {showAsLeaderEdit && !isGamesPlatform && <ImageDrop label={t("changePhoto", "Trocar foto")} small busy={uploading === "avatar"} onFile={(f) => uploadImage("avatar", f)} />}
            </div>
          </div>
          {/* A folga tem que passar do ÍCONE do pill, que escapa uns 40px para
              cá de trás da foto: sem ela o nome começa debaixo dele. */}
          <div className="flex-1 pb-1 pl-11 md:pb-2 md:pl-12">
            {showAsLeaderEdit ? (
              <input value={nameDraft} maxLength={80} onChange={(e) => setNameDraft(e.target.value)} placeholder={t("nameLabel", "Nome da comunidade")}
                className="w-full border-b-2 border-dashed border-[#F5F1E8]/30 bg-transparent fl-display text-4xl leading-[0.85] text-[#F5F1E8] outline-none md:text-6xl" />
            ) : (
              <h1 className="fl-display text-4xl leading-[0.85] text-[#F5F1E8] sm:text-5xl md:text-6xl">
                {gamerOwner ? gamerOwnerLabel : community.display_name}
              </h1>
            )}
          </div>
          {/* Publicar: quadrado amarelo com "+" no PRÓPRIO headcard (não há
              mais barra "Poste ou escreva aqui" no meio do feed). O menu abre
              com os tipos empilhados. Feed trancado (privada sem assinar) não
              mostra o botão: ali nem ler dá. */}
          {!feedLocked && (
            <div className="pb-1">
              <PublishMenuButton
                accent={accent}
                label={t("composeCta", "Publicar")}
                canPost={canPost}
                blockedMessage={publishBlockedMessage}
                onBlocked={setActionMsg}
                items={publishItems}
                onPick={(kind) => (kind === "recado" ? openRecado() : openComposer(kind))}
                extras={siteExtras}
                onPickExtra={(extraId) => {
                  if (extraId === "site") router.push(sitePath)
                }}
              />
            </div>
          )}
          {/* ENTRAR não existe na plataforma de games: ninguém "entra" no
              espaço de games de outra pessoa — visita.

              ⚠️ SAIR, sim. Quem entrou ANTES desta mudança tem uma linha de
              membresia que continua existindo no banco, e esconder o botão
              junto com o de entrar trancaria a porta de saída — a única que
              não pode existir (mesma regra do desconectar do WhatsApp e do
              gamer). Por isso o gate deixa passar quem JÁ é membro. */}
          {!isLeader && (!isGamesPlatform || !!myMembership) && (
            <div className="pb-1">
              {myMembership ? (
                myMembership.role !== "leader" ? (
                  <button type="button" disabled={busy} onClick={() => joinOrLeave("leave")}
                    className="border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60">
                    {busy ? t("leaving", "Saindo...") : t("leave", "Sair")}
                  </button>
                ) : null
              ) : isCondo ? (
                // Condomínio não tem visitante: o backend recusa o join
                // genérico (409). A porta é escolher o apartamento na planta,
                // logo abaixo — mostrar "Entrar" aqui só produziria um erro.
                <span className="inline-block border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                  {t("condoResidentsOnly", "Só moradores")}
                </span>
              ) : (
                <button type="button" disabled={busy} onClick={() => (isPrivate ? startMembershipCheckout() : joinOrLeave("join"))}
                  className="border-2 border-[#0B0B0D] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-60" style={{ background: accent }}>
                  {busy
                    ? t("joining", "Entrando...")
                    : isPrivate
                      ? `${t("subscribeJoin", "Assinar")} · ${fmtBRL(monthlyCents)}/${t("perMonthShort", "mês")}`
                      : t("join", "Entrar")}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* OS PAINÉIS DOS BOTÕES RETRÁTEIS — "Perfil" (o que a comunidade É:
          enxame, privacidade, temporada e o texto do líder) e "Mural" (o que
          ela ANUNCIA). Vêm logo abaixo do headcard porque é o que a pessoa
          acabou de pedir ao abrir o botão, e a página começa direto no feed.

          UM painel para os dois papéis, e não uma tela de configuração ao lado
          de uma tela de leitura: o visitante lê exatamente os mesmos campos que
          o líder edita. Duas telas para a mesma verdade é como uma delas para
          de contar a mudança da outra.

          A moldura é COMPARTILHADA e só a cor e o título mudam por painel — é o
          que mantém os dois com a mesma cara conforme a lista de botões
          crescer. */}
      {panel && (
        <section className="relative z-10 mx-auto mt-5 max-w-5xl px-5 md:px-10">
          <div className="border-2 border-[#0B0B0D] bg-[#0F0C08]" style={{ boxShadow: surfaceShadow(panel === "mural" || panel === "game" ? "#C2410C" : "#1D4ED8", 6) }}>
            <div className="flex items-center justify-between gap-3 border-b-2 border-[#0B0B0D] bg-[#1D1810] px-5 py-3">
              <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]">
                {panel === "game"
                  ? <><Gamepad2 className="h-4 w-4" style={{ color: "#FB923C" }} /> {t("gamePill", "Jogo atual")}</>
                  : panel === "mural"
                    ? <><Megaphone className="h-4 w-4" style={{ color: "#FB923C" }} /> {t("muralTitle", "Mural do líder")}</>
                    : <><UserRound className="h-4 w-4" style={{ color: "#60A5FA" }} /> {t("profilePanelTitle", "Perfil da comunidade")}</>}
              </span>
              <div className="flex items-center gap-2">
                {/* O líder abre o painel no modo em que a página está. Se ele
                    estiver vendo como público, o atalho liga a edição aqui
                    mesmo — mandá-lo procurar o botão lá em cima seria pedir
                    para sair do painel que ele acabou de abrir. */}
                {canAdminister && !edit && (
                  <button type="button" onClick={() => setEdit(true)}
                    className="inline-flex items-center gap-1.5 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D]">
                    <ScrollText className="h-3.5 w-3.5" /> {t("edit", "Editar")}
                  </button>
                )}
                <button type="button" onClick={() => setPanel(null)} aria-label={t("panelClose", "Fechar")}
                  className="border-2 border-[#0B0B0D] bg-[#15120E] p-1 text-[#9A938A] transition hover:text-[#F5F1E8]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* MURAL — o recado do líder. Continua PRIVADO: só membro lê, só o
                líder escreve. A recusa é dita em voz alta em vez de o painel
                abrir vazio — botão que abre o nada parece quebrado. */}
            {panel === "mural" && (
              <div className="p-4 md:p-5">
                {!isMember ? (
                  <p className="text-sm text-[#9A938A]">{t("muralMembersOnly", "Só quem é da comunidade lê o mural.")}</p>
                ) : (
                  <>
                    {showAsLeaderEdit && (
                      <div className="mb-3 space-y-2 border-b border-[#F5F1E8]/10 pb-3">
                        <textarea value={annBody} maxLength={1000} rows={2} onChange={(e) => setAnnBody(e.target.value)} placeholder={t("muralPlaceholder", "Escreva um recado para a comunidade...")}
                          className="w-full bg-transparent text-sm text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70" />
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                            <input type="checkbox" checked={annPin} onChange={(e) => setAnnPin(e.target.checked)} /> <Pin className="h-3 w-3" /> {t("muralPin", "Fixar")}
                          </label>
                          <button type="button" disabled={postingAnn || !annBody.trim()} onClick={postAnnouncement}
                            className="ml-auto inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                            {postingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} {t("muralPost", "Publicar")}
                          </button>
                        </div>
                      </div>
                    )}
                    {announcements.length === 0 ? (
                      <p className="text-sm text-[#9A938A]">{t("muralEmpty", "Nenhum recado ainda.")}</p>
                    ) : (
                      <div className="space-y-2">
                        {announcements.map((a) => (
                          <div key={a.id} className="relative border border-[#F5F1E8]/10 bg-[#1D1810] px-4 py-3">
                            {a.is_pinned && <span className="mb-1 inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}><Pin className="h-3 w-3" /> {t("pinned", "Fixado")}</span>}
                            <p className="whitespace-pre-line text-sm text-[#F5F1E8]/90">{a.body}</p>
                            <div className="mt-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.1em] text-[#9A938A]/70">
                              <span>{a.author_username ? `@${a.author_username}` : ""} · {new Date(a.created_at).toLocaleDateString()}</span>
                              {showAsLeaderEdit && <button type="button" onClick={() => deleteAnnouncement(a.id)} className="text-[#ff7a6a]"><Trash2 className="h-3.5 w-3.5" /></button>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* JOGO ATUAL — o painel do pill laranja da plataforma de games.

                ⚠️ ELE É DE QUEM OLHA (mig 232), e não do espaço. Games virou
                PLATAFORMA do site inteiro: "o feed é da plataforma; a estante, o
                jogo atual e os posts são do perfil do usuário, a mesma coisa da
                carteira e da vaquinha" (Alex, 2026-09-09). Cada um abre este
                painel e vê — e edita — o SEU jogo; o que a casa anuncia é o feed.

                ⚠️ POR ISSO O GATE AQUI É "ESTAR LOGADO", e não `showAsLeaderEdit`.
                Aquele é do administrador da plataforma (nome, foto, cores); preso
                a ele, a única coisa que é da PESSOA dentro do ambiente dependeria
                de uma permissão que ela não tem — e a tela ficaria em leitura
                mostrando o vazio dela mesma, sem como preencher.

                ⚠️ E O SALVAR É PRÓPRIO, pela mesma razão: o de cima não existe
                para quem não administra. */}
            {panel === "game" && (
              <div className="space-y-4 p-4 md:p-5">
                {/* ⚠️ O JOGO DE OUTRA PESSOA É LEITURA. O mesmo painel serve os
                    dois papéis (quem visita LÊ o que o dono ESCOLHE), como já
                    acontece no painel de Perfil das outras modalidades — dois
                    painéis divergiriam no primeiro campo novo. O que sai aqui
                    é o Salvar e os campos: eles escrevem em `/games/current`,
                    que grava pela chave do TOKEN — deixá-los de pé faria a
                    pessoa editar o próprio jogo achando que mexe no dela. */}
                {gamerOwner ? (
                  myGame?.game_title || myGame?.platform || myGame?.gamertag ? (
                    <div className="space-y-2">
                      <p className="fl-display text-2xl leading-none text-[#F5F1E8]">
                        {myGame.game_title || t("gameUntitled", "Sem título")}
                      </p>
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9A938A]">
                        {[platformLabel(myGame.platform), myGame.gamertag].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#9A938A]">
                      {t("gameEmptyOther", "{who} ainda não disse o que está jogando.")
                        .replace("{who}", gamerOwnerLabel)}
                    </p>
                  )
                ) : currentUserId ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {gamePlatforms.map(([key, label]) => (
                        <button key={key} type="button"
                          onClick={() => setGameDraft((d) => ({ ...d, platform: d.platform === key ? "" : key }))}
                          className="border-2 border-[#0B0B0D] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em]"
                          style={gameDraft.platform === key ? { background: accent, color: "#0B0B0D" } : { background: "#1D1810", color: "#9A938A" }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("gameTitleLabel", "Jogo")}</span>
                      <input value={gameDraft.game_title} maxLength={120} placeholder="Minecraft"
                        onChange={(e) => setGameDraft((d) => ({ ...d, game_title: e.target.value }))}
                        className={selectCls} />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("gamertagLabel", "Seu nick")}</span>
                      <input value={gameDraft.gamertag} maxLength={60}
                        onChange={(e) => setGameDraft((d) => ({ ...d, gamertag: e.target.value }))}
                        className={selectCls} />
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" onClick={saveMyGame} disabled={savingGame}
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D] disabled:opacity-60">
                        {savingGame ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gamepad2 className="h-4 w-4" />}
                        {t("gameSave", "Salvar meu jogo")}
                      </button>
                      {/* O que já está gravado, ao lado do botão: sem isso a
                          pessoa não distingue o rascunho que está digitando do que
                          a plataforma já sabe. */}
                      {myGame?.game_title && (
                        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A938A]">
                          <Hash className="h-3.5 w-3.5" />
                          {[myGame.game_title, platformLabel(myGame.platform)].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  // Sem sessão não há "meu jogo" — e dizer "ainda não foi
                  // escolhido" afirmaria algo sobre alguém que a tela não conhece.
                  <p className="text-sm text-[#9A938A]">
                    {t("gameSignedOut", "Entre na sua conta para dizer o que você está jogando.")}
                  </p>
                )}
              </div>
            )}

            {panel === "profile" && (
            <div className="space-y-4 p-4 md:p-5">
              {/* ENXAME (mig 219). É este campo que substitui o formulário de
                  criação: a comunidade comum nasce vazia e o assunto dela é
                  escolhido aqui, do mesmo jeito que pet/carro/games escolhem
                  raça, modelo e jogo desde a mig 211. Escolhido, ele aparece
                  fixado — para o líder e para quem visita.

                  Pet, carro, games, bairro e condomínio não têm enxame: o chip
                  do lugar dele é o ASSUNTO, que continua no banner. */}
              {(community.kind ?? "common") === "common" && (
                <Block title={t("enxameTitle", "Enxame")} icon={<Hexagon className="h-4 w-4" />} accent={accent}>
                  {showAsLeaderEdit ? (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">
                          {t("enxameLabel", "Enxame da comunidade")}
                        </span>
                        <select value={machineDraft} onChange={(e) => setMachineDraft(e.target.value)} className={selectCls}>
                          <option value="">{t("enxameNone", "— escolher depois")}</option>
                          {enxames.map((e) => (
                            <option key={e.id_machine} value={e.id_machine}>{tx.enxame(null, e.name)}</option>
                          ))}
                        </select>
                      </label>
                      <p className="mt-2 text-xs text-[#9A938A]">
                        {t("enxameHint", "É por ele que a comunidade aparece nos filtros da vitrine. Dá para escolher depois.")}
                      </p>
                    </>
                  ) : community.enxame_name ? (
                    <span className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B0B0D]">
                      <Hexagon className="h-3.5 w-3.5" /> {tx.enxame(null, community.enxame_name)}
                    </span>
                  ) : (
                    <p className="text-sm text-[#9A938A]">{t("enxameNotSet", "Ainda sem enxame escolhido.")}</p>
                  )}
                </Block>
              )}

              {/* PRIVACIDADE. Quem visita vê só o que vale para ele — se entra
                  de graça ou se entrar custa assinatura —, nunca os controles
                  nem o resumo financeiro do líder. */}
              <Block title={t("privacyTitle", "Privacidade")} icon={<Lock className="h-4 w-4" />} accent={accent}>
                {showAsLeaderEdit ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {([
                        ["public", t("privacyPublic", "Pública"), <Globe key="g" className="h-4 w-4" />],
                        ["private", t("privacyPrivate", "Privada"), <Lock key="l" className="h-4 w-4" />],
                      ] as const).map(([key, label, icon]) => (
                        <button key={key} type="button" onClick={() => setPrivacyDraft(key)}
                          className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em]"
                          style={privacyDraft === key ? { background: accent, color: "#0B0B0D" } : { background: "#1D1810", color: "#9A938A" }}>
                          {icon} {label}
                        </button>
                      ))}
                      {privacyDraft === "private" && (
                        <label className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("privacyPriceLabel", "Mensalidade R$")}</span>
                          <input value={monthlyDraft} onChange={(e) => setMonthlyDraft(e.target.value)} inputMode="decimal" placeholder="19,90"
                            className="w-20 bg-transparent text-sm font-bold text-[#F5F1E8] outline-none" />
                          <span className="text-[10px] font-bold uppercase text-[#9A938A]">/{t("perMonthShort", "mês")}</span>
                        </label>
                      )}
                      <button type="button" disabled={savingPrivacy} onClick={savePrivacy}
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                        {savingPrivacy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("privacyApply", "Aplicar")}
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                      {privacyDraft === "private"
                        ? t("privacyPrivateHint", "Privada: os posts ficam só aqui dentro (não vão pro feed nem pros bees) e entrar exige assinatura mensal. Membros atuais continuam sem pagar.")
                        : t("privacyPublicHint", "Pública: qualquer pessoa entra de graça e os posts também aparecem no feed. Assinaturas existentes param de cobrar no fim do ciclo.")}
                    </p>
                    {isPrivate && membershipSummary && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MiniStat label={t("summarySubs", "Assinantes")} value={String(membershipSummary.active_subs)} accent={accent} />
                        <MiniStat label={t("summaryWaiting", "Em liberação")} value={fmtBRL(Number(membershipSummary.waiting_cents))} accent={accent} />
                        <MiniStat label={t("summaryAvailable", "Liberado")} value={fmtBRL(Number(membershipSummary.available_cents))} accent={accent} />
                        <MiniStat label={t("summaryTotal", "Total líquido")} value={fmtBRL(Number(membershipSummary.total_net_cents))} accent={accent} />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]">
                      {isPrivate
                        ? <><Lock className="h-3.5 w-3.5" style={{ color: accent }} /> {t("privacyPrivate", "Privada")}{monthlyCents > 0 && <span style={{ color: accent }}>· {fmtBRL(monthlyCents)}/{t("perMonthShort", "mês")}</span>}</>
                        : <><Globe className="h-3.5 w-3.5" style={{ color: accent }} /> {t("privacyPublic", "Pública")}</>}
                    </span>
                    <p className="mt-2 text-xs text-[#9A938A]">
                      {isPrivate
                        ? t("privacyPrivateRead", "Entrar aqui exige assinatura mensal, e o que se publica fica só dentro da comunidade.")
                        : t("privacyPublicRead", "Qualquer pessoa entra de graça, e os posts daqui também aparecem no feed.")}
                    </p>
                  </>
                )}
              </Block>

              {/* TEMPORADA (a meta com prazo, ranking e prêmio). Quem visita vê
                  a que está valendo — ou que não há nenhuma; só o líder abre o
                  formulário. */}
              <Block title={t("goalTitle", "Temporada da comunidade")} icon={<Target className="h-4 w-4" />} accent={accent}>
                {goalFormOpen && showAsLeaderEdit ? (
                  <div className="space-y-2">
                    <input value={goalTitle} maxLength={120} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t("goalNamePlaceholder", "Ex.: Bora postar essa semana!")}
                      className="w-full border-b-2 border-dashed border-[#F5F1E8]/30 bg-transparent fl-display text-xl text-[#F5F1E8] outline-none" />
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={goalMetric} onChange={(e) => setGoalMetric(e.target.value)} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-xs font-bold uppercase text-[#F5F1E8] [&_option]:bg-[#15120E]">
                        <option value="xp">{t("metricXp", "XP coletivo")}</option>
                        <option value="posts">{t("metricPosts", "Publicações")}</option>
                        <option value="shares">{t("metricShares", "Compartilhamentos")}</option>
                      </select>
                      <select value={goalDays} onChange={(e) => setGoalDays(Number(e.target.value))} className="border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-1.5 text-xs font-bold uppercase text-[#F5F1E8] [&_option]:bg-[#15120E]">
                        <option value={30}>{t("goalDays30", "30 dias")}</option>
                        <option value={60}>{t("goalDays60", "60 dias")}</option>
                        <option value={90}>{t("goalDays90", "90 dias")}</option>
                      </select>
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                      🏆 {t("goalPrizeNote", "100 poléns pro 1º lugar")} · {t("goalMinMembers", "mín. 5 membros")} {(community.member_count ?? 0) < 5 ? `(${community.member_count ?? 0}/5)` : ""}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button type="button" disabled={savingGoal || (community.member_count ?? 0) < 5} onClick={saveGoal} className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                        {savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("goalStart", "Iniciar temporada")}
                      </button>
                      {goal && <button type="button" onClick={removeGoal} className="inline-flex items-center gap-2 border-2 border-[#ff5a44]/60 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#ff7a6a]"><Trash2 className="h-4 w-4" /> {t("goalRemove", "Remover")}</button>}
                      <button type="button" onClick={() => setGoalFormOpen(false)} className="border-2 border-[#F5F1E8]/20 px-4 py-1.5 text-xs font-bold uppercase text-[#9A938A]">{t("cancel", "Cancelar")}</button>
                    </div>
                  </div>
                ) : goal ? (
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="fl-display text-xl leading-tight text-[#F5F1E8]">{goal.title}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 border-2 border-[#0B0B0D] bg-[#1D1810] px-2 py-0.5 text-[10px] font-extrabold uppercase" style={{ color: accent }}>
                        <Sparkles className="h-3 w-3" /> {goal.prize_polens} {t("polensWord", "poléns")}
                      </span>
                    </div>
                    {goal.status === "closed" ? (
                      <div className="mt-3 border-2 border-[#0B0B0D] bg-[#1D1810] px-4 py-3">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{t("goalEnded", "Temporada encerrada")}</p>
                        {goal.winner ? (
                          <p className="mt-1 flex items-center gap-2 fl-display text-lg text-[#F5F1E8]">🏆 {goal.winner.name} <span className="text-xs font-bold text-[#9A938A]">· {t("goalWonPrize", "levou")} {goal.prize_polens} {t("polensWord", "poléns")}</span></p>
                        ) : (
                          <p className="mt-1 text-sm text-[#9A938A]">{t("goalNoWinner", "Sem vencedor (ninguém pontuou).")}</p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                          <span className="inline-flex items-center gap-1"><Target className="h-3 w-3" style={{ color: accent }} /> {metricLabel(goal.metric)}</span>
                          <span>· {t("goalDaysLeft", "faltam")} {daysLeft(goal.ends_at) ?? 0} {t("goalDaysWord", "dias")}</span>
                        </div>
                        {goal.percent != null && (
                          <div className="mt-2 h-4 w-full overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
                            <div className="h-full transition-[width] duration-500" style={{ width: `${goal.percent}%`, background: accent }} />
                          </div>
                        )}
                      </>
                    )}
                    {showAsLeaderEdit && (
                      <button type="button" onClick={openGoalForm} className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#F5F1E8] underline">
                        {goal.status === "closed" ? t("goalNewSeason", "Nova temporada") : t("goalEdit", "Editar temporada")}
                      </button>
                    )}
                  </div>
                ) : showAsLeaderEdit ? (
                  <button type="button" onClick={openGoalForm} className="inline-flex items-center gap-2 border-2 border-dashed border-[#F5F1E8]/25 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#9A938A] hover:border-[#F5F1E8]/60">
                    <Plus className="h-4 w-4" /> {t("goalStart", "Iniciar temporada")}
                  </button>
                ) : (
                  <p className="text-sm text-[#9A938A]">{t("goalNoneRead", "Nenhuma temporada em andamento.")}</p>
                )}
              </Block>

              {/* SOBRE A COMUNIDADE — o texto do líder. Quem visita lê; só o
                  líder escreve, e no MESMO Salvar do nome e das cores. */}
              <Block title={t("profileSection", "Perfil")} icon={<ScrollText className="h-4 w-4" />} accent={accent}>
                {showAsLeaderEdit ? (
                  <textarea value={bioDraft} maxLength={200} onChange={(e) => setBioDraft(e.target.value)} placeholder={t("bioPlaceholder", "Conte sobre a comunidade...")} rows={4}
                    className="w-full bg-transparent text-sm leading-relaxed text-[#F5F1E8]/85 outline-none placeholder:text-[#9A938A]/70" />
                ) : community.bio ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-[#F5F1E8]/85">{community.bio}</p>
                ) : (
                  <p className="text-sm text-[#9A938A]">{t("bioEmptyRead", "O líder ainda não escreveu sobre a comunidade.")}</p>
                )}
              </Block>
            </div>
            )}
          </div>
        </section>
      )}

      {actionMsg && (
        <div className="relative z-10 mx-auto mt-4 max-w-5xl px-5 md:px-10">
          <p className="inline-block border-2 border-[#0B0B0D] bg-[#15120E] px-3 py-1.5 text-xs font-bold text-[#F5F1E8]">{actionMsg}</p>
        </div>
      )}

      {/* OS NÚMEROS DA COMUNIDADE — UMA coluna, num SIDEBAR (2026-09-06).

          Eram dois lugares: a fita de três KPIs (membros, nível, XP) empurrando
          o feed para baixo e a barra lateral (benchmark, destaque, ranking) que
          no celular virava um rodapé depois do último post. Agora é uma coluna
          só, enfileirada nesta ordem, e ela não ocupa lugar nenhum na página:
          o que fica no ar é a PONTINHA DA SETA na borda direita, e quem aperta
          recebe a gaveta inteira — no celular e no computador.

          Vale para TODA comunidade — comum, condomínio, bairro, pet e carro
          usam esta mesma casca. Bloco novo de número desta página entra AQUI
          DENTRO, nunca solto entre o headcard e o feed.

          ⚠️ A PLATAFORMA DE GAMES FICOU ÓRFÃ DELA (2026-09-08). A gaveta
          responde "que tamanho tem este GRUPO" — membros, nível, XP, posição
          entre comunidades, destaque e ranking dos membros —, e ali dentro
          não há grupo: a plataforma é uma por pessoa, ninguém entra. Os três
          blocos que falam de gente já saíam; o que sobrava (nível, XP e um
          benchmark que compara a plataforma com comunidades) media a régua
          errada. O que games tem de fila é o RANKING da plataforma, atrás do
          botão do mural. Guard aqui, e não dentro de cada bloco: por dentro,
          o bloco novo que esquecesse da regra reacenderia a alça sozinho.

          A peça se desenha por PORTAL no <body>, então este lugar no JSX é só
          onde ela mora perto dos dados que lê — não é onde ela aparece. */}
      {!isGamesPlatform && (
      <RetractableColumn
        title={t("statsTitle", "Números da comunidade")}
        ariaLabel={t("statsAria", "Números da comunidade: membros, nível, XP, benchmark, destaque e ranking")}
        closeLabel={t("panelClose", "Fechar")}
        icon={<BarChart3 className="h-4 w-4" />}
        accent={accent}
        skinClass={isBusinessPlatform ? "fl-business" : undefined}
        skinVars={skinVars}
      >
        <Kpi icon={<Users className="h-4 w-4" />} label={t("membersCount", "membros")} value={community.member_count != null ? compact(community.member_count) : "—"} accent={accent} />
        <Kpi icon={<Trophy className="h-4 w-4" />} label={t("level", "Nível")} value={community.xp_level != null ? String(community.xp_level) : "—"} accent={accent} />
        <Kpi icon={<Sparkles className="h-4 w-4" />} label="XP" value={community.xp_total != null ? compact(community.xp_total) : "—"} accent={accent} />
        {benchmark && (
          // A sombra dura saiu daqui quando o bloco entrou na coluna: quem
          // carrega o accent é a barra que abre a coluna, e uma sombra de 6px
          // no meio de blocos empilhados a 12px de distância faria só este
          // parecer descolado da fila.
          <div className="relative border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-5">
            <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#9A938A]">
              <BarChart3 className="h-4 w-4" /> {t("benchmarkTitle", "Benchmark")}
            </div>
            <div className="mt-1 fl-display text-5xl leading-none" style={{ color: accent }}>#{benchmark.position}</div>
            <p className="mt-1 text-xs font-semibold text-[#9A938A]">
              {t("benchmarkOf", "de")} {benchmark.total} · {benchmark.enxame_name ? tx.enxame(null, benchmark.enxame_name) : t("communitiesWord", "comunidades")}
            </p>
            {benchmark.percentile != null && benchmark.total > 1 && (
              <span className="mt-2 inline-block border-2 border-[#F5F1E8]/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: accent }}>
                {t("benchmarkTop", "top")} {benchmark.percentile}%
              </span>
            )}
          </div>
        )}

        {topRow && (
          <Block title={t("spotlightTitle", "Destaque")} icon={<Star className="h-4 w-4" />} accent={accent}>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]" style={{ outline: `2px solid ${accent}`, outlineOffset: "1px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={topRow.avatar_url || "/placeholder-user.jpg"} alt={topRow.name || ""} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate fl-display text-lg leading-tight text-[#F5F1E8]">{topRow.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">
                  {seasonOn && goal?.status === "closed" ? `🏆 ${t("spotlightWinner", "Vencedor")}` : seasonOn ? t("spotlightLeader", "Líder da temporada") : t("spotlightSub", "Membro destaque")} · {rowScore(topRow)}{seasonOn && goal?.metric === "posts" ? ` ${t("postsEng", "posts/eng")}` : ""}
                </p>
              </div>
            </div>
          </Block>
        )}

        {rankRows.length > 0 && (
          <Block title={seasonOn ? t("rankingSeasonTitle", "Ranking da temporada") : t("rankingTitle", "Ranking dos membros")} icon={<Trophy className="h-4 w-4" />} accent={accent}>
            <ol className="space-y-2">
              {rankRows.slice(0, 5).map((row, i) => (
                <li key={row.id_user} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 fl-display text-base text-[#F5F1E8]/40">{i + 1}</span>
                  <div className="h-8 w-8 shrink-0 overflow-hidden border border-[#0B0B0D] bg-[#1D1810]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={row.avatar_url || "/placeholder-user.jpg"} alt="" className="h-full w-full object-cover" />
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#F5F1E8]">{row.name}</span>
                  <span className="shrink-0 text-[11px] font-extrabold" style={{ color: accent }}>{rowScore(row)}</span>
                </li>
              ))}
            </ol>
            {seasonOn && goal?.metric === "posts" && (
              <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[#9A938A]/70">{t("postsEngHint", "posts / engajamento")}</p>
            )}
            {/* A gaveta é RESUMO: mostra cinco e diz onde estão os outros. Sem
                esta linha, uma comunidade de trinta membros pareceria ter cinco
                — e o pódio inteiro (com a temporada e a lista) mora na página
                que o pill roxo do headcard abre. */}
            <Link href={`/comunidades/${id}/ranking`}
              className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] hover:bg-[#241d12]">
              <Trophy className="h-3.5 w-3.5" /> {t("rankingSeeAll", "Ver ranking completo")}
            </Link>
          </Block>
        )}
      </RetractableColumn>
      )}

      {/* CONTEÚDO — uma coluna só: o que era a barra lateral (benchmark,
          destaque, ranking) subiu para a coluna retrátil dos números, então o
          feed ocupa a largura inteira. */}
      <div className="relative z-10 mx-auto mt-8 max-w-5xl px-5 md:px-10">
        <div className="space-y-6">
          {/* Condomínio (migs 205/206): portaria, família × disputa, planta e
              veredito. Mesma casca — muda o que aparece dentro dela. */}
          {isCondo && (
            <>
              <CondoResidence communityId={id} onResidencyChange={loadAll} />
              <CondoExtras
                communityId={id}
                isAdmin={canAdminister || !!community.viewer_is_admin}
                isResident={isResident}
                onReload={loadAll}
              />
            </>
          )}
          {/* O ASSUNTO da comunidade (mig 210/211): raça do pet, modelo do
              carro, jogo. Fica aqui, no modo de edição, e não num modal de
              cadastro — a comunidade nasce vazia e é batizada dentro de si
              mesma (decisão do Alex: "já entra numa página pronta editável"). */}
          {showAsLeaderEdit && subjectKind === "pet" && (
            <Block title={t("subjectPetTitle", "Sobre o pet")} icon={<PawPrint className="h-4 w-4" />} accent={accent}>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {([
                    ["dog", t("speciesDog", "Cachorro")],
                    ["cat", t("speciesCat", "Gato")],
                    ["other", t("speciesOther", "Outro animal")],
                  ] as const).map(([key, label]) => (
                    <button key={key} type="button"
                      onClick={() => setPetDraft((d) => ({ ...d, species: key, breed_slug: "" }))}
                      className="border-2 border-[#0B0B0D] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em]"
                      style={petDraft.species === key ? { background: accent, color: "#0B0B0D" } : { background: "#1D1810", color: "#9A938A" }}>
                      {label}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("breedLabel", "Raça")}</span>
                  <select value={petDraft.breed_slug}
                    onChange={(e) => {
                      const slug = e.target.value
                      const found = breeds.find((b) => b.slug === slug)
                      setPetDraft((d) => ({ ...d, breed_slug: slug, breed_label: found ? found.label : d.breed_label }))
                    }}
                    className={selectCls}>
                    <option value="">{petDraft.breed_label || t("breedUnknown", "Não sei / não informar")}</option>
                    {breeds.map((b) => (
                      <option key={b.id_breed} value={b.slug}>{b.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("birthYearLabel", "Ano de nascimento")}</span>
                  <input value={petDraft.birth_year} inputMode="numeric" placeholder="2021"
                    onChange={(e) => setPetDraft((d) => ({ ...d, birth_year: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                    className={selectCls} />
                </label>
              </div>
            </Block>
          )}

          {showAsLeaderEdit && subjectKind === "car" && (
            <Block title={t("subjectCarTitle", "O carro")} icon={<Car className="h-4 w-4" />} accent={accent}>
              <div className="space-y-3">
                <p className="text-xs leading-snug text-[#9A938A]">
                  {t("carUniqueHint", "Existe uma única comunidade por modelo. Se o modelo já tiver dono, o site avisa e leva você até ela.")}
                </p>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("carBrandLabel", "Marca")}</span>
                  <select value={carDraft.brand_code}
                    onChange={(e) => setCarDraft({ brand_code: e.target.value, model_code: "" })}
                    className={selectCls}>
                    <option value="">—</option>
                    {carBrands.map((b) => (
                      <option key={b.code} value={b.code}>{b.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#9A938A]">{t("carModelLabel", "Modelo")}</span>
                  <select value={carDraft.model_code} disabled={!carDraft.brand_code}
                    onChange={(e) => setCarDraft((d) => ({ ...d, model_code: e.target.value }))}
                    className={selectCls}>
                    <option value="">{carDraft.brand_code ? "—" : t("carPickBrandFirst", "Escolha a marca")}</option>
                    {carModels.map((m) => (
                      <option key={m.code} value={m.code}>{m.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Block>
          )}

          {/* Tabs */}
          <div ref={tabsRef} className="scroll-mt-4">
            <div className="flex gap-1 border-b-2 border-[#F5F1E8]/15">
              {communityTabs.map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} className="-mb-0.5 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8]"
                  style={{ borderBottom: tab === key ? `4px solid ${accent}` : "4px solid transparent", opacity: tab === key ? 1 : 0.5 }}>
                  {label}
                </button>
              ))}
              {/* "Site" fica na fila das abas porque é ali que se procura por
                  ele — mas é LINK, não aba: o site abre na página dele. Manter
                  as duas coisas (aba e página) daria duas experiências do mesmo
                  site, e a de dentro da caixa é a que mente sobre o resultado. */}
              {showSiteEntry && (
                <Link href={sitePath} className="-mb-0.5 flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#F5F1E8] opacity-50 hover:opacity-100"
                  style={{ borderBottom: "4px solid transparent" }}>
                  <Globe className="h-3.5 w-3.5" style={{ color: accent }} />
                  {t("tabSite", "Site")}
                </Link>
              )}
            </div>

            <div className="mt-6">
              {tab === "shelf" ? (
                // ⚠️ A ESTANTE É DE QUEM OLHA, e não do "dono do espaço": a
                // plataforma não tem dono, e a biblioteca é dado da PESSOA
                // (`tb_user_game_account.id_user`). O componente resolve o dono
                // pelo token — daí a única pergunta que sobra ser se há sessão.
                <GamerShelf
                  signedIn={!!currentUserId}
                  accent={accent}
                  // Visitando, a estante é a DELE — e a privacidade dela é
                  // checada no backend (estante fechada volta `locked`, com a
                  // mesma resposta de "não conectou nada", para não entregar a
                  // escolha de quem fechou).
                  ownerUserId={gamerOwner?.id_user ?? null}
                  ownerName={gamerOwner?.username ?? null}
                />
              ) : tab === "members" ? (
                members.length === 0 ? <Empty text={t("membersEmpty", "Sem membros ainda.")} /> : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ranked.map((m, i) => (
                      <div key={m.id_user} className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] p-3">
                        <span className="fl-display text-xl leading-none text-[#F5F1E8]/30">{i + 1}</span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.top_profile_avatar || "/placeholder-user.jpg"} alt={m.top_profile_name || m.user_name || ""} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate fl-display text-base leading-tight text-[#F5F1E8]">{m.top_profile_name || m.user_name}</p>
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">
                            {m.role === "leader" ? <><Crown className="h-3 w-3" style={{ color: accent }} /> {t("roleLeader", "Líder")}</> :
                             m.role === "vice" ? <><Shield className="h-3 w-3" style={{ color: accent }} /> {t("roleVice", "Vice-líder")}</> :
                             t("roleMember", "Membro")} · {compact(m.top_profile_xp)} XP
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : feedLocked ? (
                <div className="border-2 border-[#0B0B0D] bg-[#15120E] px-6 py-14 text-center">
                  <Lock className="mx-auto h-10 w-10" style={{ color: accent }} />
                  <p className="mt-4 fl-display text-2xl text-[#F5F1E8]">{t("lockedTitle", "Comunidade privada")}</p>
                  <p className="mx-auto mt-2 max-w-sm text-sm text-[#9A938A]">
                    {t("lockedText", "O feed é exclusivo para membros. Assine para entrar e ver tudo que acontece aqui dentro.")}
                  </p>
                  <button type="button" disabled={busy} onClick={startMembershipCheckout}
                    className="mt-5 inline-flex items-center gap-2 border-2 border-[#0B0B0D] px-6 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-60"
                    style={{ background: accent }}>
                    <Lock className="h-4 w-4" /> {t("subscribeJoin", "Assinar")} · {fmtBRL(monthlyCents)}/{t("perMonthShort", "mês")}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {bees.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto pb-1">
                      {bees.map((b) => (
                        <Link
                          key={b.id_story}
                          href={`/bees?bee=${encodeURIComponent(b.id_story)}`}
                          className="group shrink-0"
                          title={b.caption || undefined}
                        >
                          <span
                            className="block h-28 w-20 overflow-hidden border-2 border-[#0B0B0D] bg-[#1D1810]"
                            style={{ outline: `2px solid ${accent}`, outlineOffset: "2px" }}
                          >
                            {b.thumbnail_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={b.thumbnail_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <span className="grid h-full w-full place-items-center">
                                <Hexagon className="h-6 w-6" style={{ color: accent }} />
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block max-w-20 truncate text-[10px] font-bold text-[#9A938A]">
                            {b.profile_name || b.author_username || ""}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Feed unificado (posts + bees + recados) — cards padrão do Freelandoo */}
                  {loadingPosts ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#9A938A]" /></div>
                  ) : posts.length === 0 ? (
                    // FEED VAZIO: o convite ocupa o lugar da caixa "ainda não
                    // há publicações" em vez de ficar ao lado dela — a caixa
                    // dizia que faltava alguma coisa sem dar o que fazer, e o
                    // "+" do headcard é pequeno demais para ser a resposta.
                    // Quem não pode publicar continua vendo só o aviso: um
                    // convite gigante que só devolve recusa é pior que nada.
                    canPost ? (
                      <PublishMenuButton
                        variant="block"
                        text={t("publishFeedCta", "Postar")}
                        accent={accent}
                        label={t("composeCta", "Publicar")}
                        canPost={canPost}
                        blockedMessage={publishBlockedMessage}
                        onBlocked={setActionMsg}
                        items={publishItems}
                        onPick={(kind) => (kind === "recado" ? openRecado() : openComposer(kind))}
                      />
                    ) : (
                      <Empty text={t("feedEmptyGroup", "Ainda não há publicações. Seja o primeiro!")} />
                    )
                  ) : (
                    <div className="space-y-3">
                      {/* COM PUBLICAÇÕES: a mesma porta vira uma faixa fina no
                          topo da lista. Ela não pode competir com o conteúdo
                          que já está lá — quem chega aqui veio ler, não
                          publicar. */}
                      {canPost && (
                        <PublishMenuButton
                          variant="bar"
                          text={t("publishFeedCta", "Postar")}
                          accent={accent}
                          label={t("composeCta", "Publicar")}
                          canPost={canPost}
                          blockedMessage={publishBlockedMessage}
                          onBlocked={setActionMsg}
                          items={publishItems}
                          onPick={(kind) => (kind === "recado" ? openRecado() : openComposer(kind))}
                        />
                      )}
                      <div className="overflow-hidden border-2 border-[#0B0B0D] bg-[#0b0804]">
                      {posts.map((post) => (
                        <PortfolioPostCard
                          key={post.post_id}
                          post={post}
                          filters={FEED_FILTERS}
                          commentsCount={post.comments_count ?? 0}
                          hideCommunityLink
                          onDeleteRecado={deleteRecado}
                          canDeleteRecado={canAdminister || (!!currentUserId && post.author_user_id === currentUserId)}
                          shareUrlOverride={
                            isMember && currentUserId && typeof window !== "undefined"
                              ? `${window.location.origin}/cs/${id}/${currentUserId}/${post.post_id}`
                              : undefined
                          }
                          onOpenComments={openPostComments}
                          onLikeChange={handleLikeChange}
                        />
                      ))}
                      </div>
                    </div>
                  )}
                  {postsHasMore && (
                    <div className="flex justify-center">
                      <button type="button" disabled={loadingMorePosts} onClick={() => fetchPosts(false, postsCursor)}
                        className="inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#15120E] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-[#F5F1E8] disabled:opacity-60">
                        {loadingMorePosts ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t("loadMore", "Ver mais")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra fixa de edição */}
      {showAsLeaderEdit && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-[#0B0B0D] bg-[#15120E] px-5 py-3">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#9A938A]"><Hash className="h-4 w-4" /> {community.display_name}</span>
            {actionMsg && <span className="text-xs font-bold text-[#F5F1E8]/80">{actionMsg}</span>}
            <button type="button" onClick={saveAll} disabled={saving}
              className="ml-auto inline-flex items-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-5 py-2 text-sm font-extrabold uppercase tracking-[0.14em] text-[#0B0B0D] disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t("save", "Salvar")}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Recado (nota só-texto, até 2000 chars) */}
      {recadoOpen && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4" onClick={() => !postingRecado && setRecadoOpen(false)}>
          <div className="w-full max-w-md border-2 border-[#0B0B0D] bg-[#15120E]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-2 border-[#F5F1E8]/12 px-4 py-3">
              <span className="inline-flex items-center gap-2 fl-display text-lg text-[#F2B705]"><MessageSquare className="h-4 w-4" /> {t("recadoTitle", "Novo recado")}</span>
              <button type="button" onClick={() => setRecadoOpen(false)} aria-label={t("cancel", "Cancelar")} className="grid h-8 w-8 place-items-center text-[#9A938A] hover:text-[#F5F1E8]"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-4 py-4">
              <textarea value={recadoBody} maxLength={2000} rows={6} autoFocus onChange={(e) => setRecadoBody(e.target.value.slice(0, 2000))}
                placeholder={t("recadoPlaceholder", "Escreva um recado para a comunidade...")}
                className="w-full resize-none border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2.5 text-sm leading-relaxed text-[#F5F1E8] outline-none placeholder:text-[#9A938A]/70" />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#9A938A]">{t("recadoOnlyHere", "Fica só na comunidade")}</span>
                <span className="text-[10px] tabular-nums text-[#9A938A]/70">{recadoBody.length}/2000</span>
              </div>
              <button type="button" disabled={postingRecado || !recadoBody.trim()} onClick={postRecado}
                className="mt-3 flex w-full items-center justify-center gap-2 border-2 border-[#0B0B0D] bg-[#F2B705] px-4 py-2.5 text-sm font-extrabold uppercase tracking-[0.12em] text-[#0B0B0D] disabled:opacity-50">
                {postingRecado ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />} {t("recadoPublish", "Postar recado")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Painel de comentários + composer */}
      <CommentsPanel
        postId={openCommentsFor}
        open={!!openCommentsFor}
        onClose={() => setOpenCommentsFor(null)}
        loginNextPath={`/comunidades/${id}`}
        onCountChange={(pid, delta) => setPosts((prev) => prev.map((p) => p.post_id === pid ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 0) + delta) } : p))}
      />
      {composerOpen && (
        <MediaComposer
          open
          mode={composerKind}
          communityId={id}
          communityName={community.display_name}
          // ESPELHO de `CommunityPolicy.contentIsExclusive` (backend): privada,
          // condomínio e bairro guardam o que se publica lá dentro. Aqui o
          // espelho serve só para NÃO OFERECER uma escolha que o backend
          // recusaria — quem decide continua sendo o backend, então errar para
          // mais neste lado esconde uma opção, nunca abre uma porta.
          communityExclusiveOnly={isPrivate || isCondo || community.kind === "neighborhood"}
          // ⚠️ SEM PADRÃO EXCLUSIVO EM GAMES (mig 232). Ele existia porque o
          // espaço era de UMA pessoa: guardar ali dentro era o esperado. Numa
          // plataforma pública de todos, começar marcado em "só na comunidade"
          // tiraria do feed geral, sem ninguém pedir, tudo que se publica no
          // maior ambiente do site. O Financeiro — a outra plataforma — nunca
          // teve esse padrão, e a régua da casa desde 2026-09-06 é comunidade
          // + feed geral.
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false)
            // O bee não entra no feed de portfólio — ele vive na faixa. Por
            // isso as duas recargas: sem a segunda, publicar um bee pareceria
            // não ter feito nada.
            fetchPosts(true)
            fetchBees()
          }}
        />
      )}
    </div>
  )
}

function ImageDrop({ onFile, label, small, busy }: { onFile: (f: File) => void; label: string; small?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }}
      onClick={() => ref.current?.click()}
      className={`absolute inset-0 z-30 flex cursor-pointer flex-col items-center justify-center gap-1 bg-black/50 text-white transition-opacity hover:opacity-100 ${busy ? "opacity-100" : "opacity-0"} ${small ? "text-[10px]" : "text-xs"}`}
    >
      {busy ? <Loader2 className={small ? "h-5 w-5 animate-spin" : "h-7 w-7 animate-spin"} /> : <ImagePlus className={small ? "h-5 w-5" : "h-7 w-7"} />}
      <span className="font-bold uppercase tracking-wide">{label}</span>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "" }} />
    </div>
  )
}

/**
 * Um número da comunidade. Nasceu numa fita de três colunas e hoje é uma LINHA
 * da coluna retrátil: rótulo à esquerda, número à direita. Empilhados, os três
 * viram a fila que o desenho pede — membros, nível e XP, um em cima do outro.
 */
function Kpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="flex items-center gap-3 border-2 border-[#0B0B0D] bg-[#15120E] px-4 py-3">
      <span className="shrink-0" style={{ color: accent }}>{icon}</span>
      <span className="flex-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A938A]">{label}</span>
      <span className="fl-display text-2xl leading-none text-[#F5F1E8]">{value}</span>
    </div>
  )
}

function Block({ title, icon, accent, children }: { title: string; icon: React.ReactNode; accent: string; children: React.ReactNode }) {
  return (
    <div className="relative border-2 border-[#0B0B0D] bg-[#15120E] p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-[#F5F1E8]/10 pb-2">
        <span className="flex flex-1 items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#F5F1E8]"><span style={{ color: accent }}>{icon}</span>{title}</span>
      </div>
      {children}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9A938A]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-extrabold" style={{ color: accent }}>{value}</p>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-2 border-dashed border-[#F5F1E8]/20 bg-[#15120E]/40 py-16 text-center text-xs font-bold uppercase tracking-[0.12em] text-[#9A938A]">
      {text}
    </div>
  )
}
