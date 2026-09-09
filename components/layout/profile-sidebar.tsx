"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Boxes, Crown, Gamepad2, Globe, Hexagon, Home, Joystick, LayoutGrid, Library, Megaphone, MessageCircle, Trophy, UserRound, Users, type LucideIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { HoverHint } from "@/features/tour/HoverHint"
import type { HintId } from "@/features/tour/hints"
import { useTour } from "@/features/tour/useTour"
import dynamic from "next/dynamic"
import { useActiveContext, type ActiveContext } from "./use-active-context"
// Quem avisa que a rota atual é a plataforma de GAMES é a própria página (a
// modalidade não está na URL). Ver o comentário do arquivo.
import {
  useCommunityShell,
  requestCommunityView,
  type CommunityView,
  type Shell,
} from "./community-shell"
import { useNavCounts } from "@/components/navigation/use-nav-counts"
import { useFeature } from "@/components/feature-flags/FeatureFlagsProvider"

// F3.S7 (shell): o sidebar é global (layout raiz) e o UserDropside é pesado —
// import estático colocava ele no First Load de TODAS as rotas. O chunk baixa
// na primeira abertura; depois fica montado (latch) pra animação de fechar.
const UserDropside = dynamic(
  () => import("./UserDropside").then((m) => m.UserDropside),
  { ssr: false },
)

interface SidebarItem {
  href: string
  label: string
  icon: LucideIcon
  activePath?: string
  matchPrefix?: string
  accent?: boolean
  /**
   * Item que aponta para a MESMA página em que talvez já estejamos, mudando só
   * a querystring. Navegar não resolve (a rota não remonta e a querystring não
   * é relida), então, quando o caminho atual já é `viewPath`, o clique vira um
   * PEDIDO para a página (`requestCommunityView`) em vez de uma navegação.
   *
   * Vindo de outra rota o `href` continua valendo: a página monta e lê o
   * parâmetro do window, como sempre leu.
   */
  view?: CommunityView
  /** Caminho em que o `view` substitui a navegação. */
  viewPath?: string
}

const HIDDEN_ON_PATHS = [
  "/login",
  "/cadastro",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/confirmar-email",
  "/activate",
  "/bem-vindo",
  // O JOGO É TELA CHEIA E DEITADA. No celular esta toolbar é uma pílula fixa
  // no rodapé CENTRAL — exatamente onde a build Godot desenha o botão de sair
  // da partida (ver `jogo/scripts/ui/toque.gd`). Os dois no mesmo pixel: quem
  // fosse sair da partida sairia do jogo, e vice-versa.
  "/monsters",
]

/**
 * Os itens que NÃO dependem do contexto ativo.
 *
 * Os três contextos (usuário, perfil, clã) sempre repetiram esta mesma
 * lista e só divergem no Ranking, que muda de destino. Ela é constante para que
 * um item novo não precise ser copiado em três lugares — o terceiro é sempre o
 * lugar de onde ele some quando alguém mexer só nos outros dois.
 *
 * ⚠️ O MONSTERS SAIU DAQUI (pedido do Alex, 2026-09-08). O jogo continua
 * alcançável, mas por DENTRO do ambiente de games: pill roxo do headcard →
 * plataforma → item "Game" do dock de lá (ver `buildGamesItems`). A barra
 * principal é a da Freelandoo inteira, e o jogo é uma sala dentro de um
 * ambiente — anunciá-lo aqui dava a ele um degrau que nem Estante nem Jogo
 * atual têm. Botão novo que sirva a plataforma toda entra aqui; o que serve o
 * ambiente de games entra no dock de games.
 */
const ITENS_COMUNS: SidebarItem[] = [
  { href: "/feed", label: "Feed", icon: Home, matchPrefix: "/feed" },
  { href: "/bees", label: "Bees", icon: Hexagon, matchPrefix: "/bees" },
  { href: "/search?machine", label: "Enxames", icon: Boxes, activePath: "/search" },
  { href: "/mensagens", label: "Mensagens", icon: MessageCircle, matchPrefix: "/mensagens" },
]

/**
 * O DOCK DENTRO DA PLATAFORMA DE GAMES.
 *
 * A barra não some nem muda de forma — continua transparente e no mesmo lugar.
 * O que troca é o CONTEÚDO dela: dentro do ambiente, os itens da Freelandoo
 * (Bees, Enxames, Mensagens, Ranking) dariam saída lateral para fora do
 * ambiente sem dizer que estão saindo. A porta de volta é UMA só, e é a foto —
 * que ali ganha o fundo amarelo justamente para se anunciar como saída.
 *
 * "Jogo atual" e "Estante" são DEEP-LINKS para a mesma página do ambiente (o
 * painel e a aba que já existem lá), não telas novas: dois lugares desenhando o
 * jogo atual seria a segunda verdade que o painel único veio evitar.
 *
 * ⚠️ E é por serem a mesma página que eles precisam do `view`: dentro do
 * ambiente, o clique não pode ser uma navegação (a rota não remonta e o
 * parâmetro não é relido — o botão mudava a URL e não fazia nada). Ver o
 * comentário do `games-shell`. O "Feed" entra na mesma regra: sem ele, quem
 * abrisse a Estante não teria como voltar pelo dock.
 */
function buildGamesItems(communityId: string, shelfOn: boolean, gamerContext?: string | null): SidebarItem[] {
  const root = `/comunidades/${communityId}`
  // ⚠️ SÓ O "POSTS GAMES" PRECISA DO CONTEXTO, porque ele é o único que NAVEGA
  // de verdade. "Estante" e "Jogo atual" pedem a vista à página que já está no
  // contexto (a URL, com o `?de=`, nem muda). Sem isto, apertar Posts dentro do
  // games de alguém abriria os posts de quem olha — e o pill ciano da mesma
  // tela abriria os dela: dois botões vizinhos discordando.
  const postsHref = gamerContext
    ? `${root}/posts?de=${encodeURIComponent(gamerContext)}`
    : `${root}/posts`
  return [
    { href: root, label: "Feed", icon: Home, activePath: root, view: "feed", viewPath: root },
    // A Estante existe enquanto a conexão de plataforma estiver ligada no
    // Painel de Controle — é a MESMA condição que faz a aba existir na página.
    // Sem esta linha, desligar a flag deixaria no dock um botão que abre uma aba
    // que não está lá: porta pintada, o pior tipo de botão.
    ...(shelfOn
      ? ([{ href: `${root}?aba=estante`, label: "Estante", icon: Library, view: "shelf", viewPath: root }] as SidebarItem[])
      : []),
    { href: `${root}?painel=jogo`, label: "Jogo atual", icon: Gamepad2, view: "game", viewPath: root },
    { href: postsHref, label: "Posts games", icon: LayoutGrid, activePath: `${root}/posts` },
    // O JOGO de verdade. Ele é tela cheia e deitada, e o dock se esconde lá
    // dentro (ver HIDDEN_ON_PATHS) — quem sai da partida é o botão da própria
    // build Godot.
    { href: "/monsters", label: "Game", icon: Joystick, matchPrefix: "/monsters" },
  ]
}

/**
 * O DOCK DENTRO DE "MEUS NEGÓCIOS" (a comunidade de modalidade `common`).
 *
 * Mesma ideia do de games: a barra da Freelandoo inteira daria saída lateral
 * para fora do ambiente sem dizer que está saindo, e a porta de volta é UMA — a
 * foto, que ali ganha o fundo amarelo.
 *
 * O conteúdo é o da PÁGINA: os três pills do headcard (Perfil, Mural, Ranking),
 * mais as duas abas (Membros e Feed). Pills e abas continuam existindo na tela;
 * o dock é um segundo caminho para as MESMAS coisas, não uma cópia delas — quem
 * de fato abre painel e troca aba é a página, que recebe o pedido.
 *
 * ⚠️ O RANKING NAVEGA, os outros não. Ele é uma página (`/ranking`), como
 * "Posts games" no dock de games; Perfil, Mural, Membros e Feed são estado da
 * mesma tela e por isso vão pelo `view`.
 *
 * ⚠️ O SITE É SÓ DO LÍDER e vem em AMARELO (`accent`), o mesmo contorno do item
 * de Administração da barra principal: ele leva ao CONSTRUTOR, e o construtor
 * recusa quem não é líder. Quem decide se ele aparece é a página
 * (`canBuildSite`), que é onde modalidade, papel e flag se encontram — repetir
 * a conta aqui daria duas respostas para "esta pessoa pode editar o site?".
 */
function buildBusinessItems(communityId: string, canBuildSite: boolean): SidebarItem[] {
  const root = `/comunidades/${communityId}`
  return [
    { href: `${root}?painel=perfil`, label: "Perfil", icon: UserRound, view: "profile", viewPath: root },
    { href: `${root}?painel=mural`, label: "Mural", icon: Megaphone, view: "mural", viewPath: root },
    { href: `${root}/ranking`, label: "Ranking", icon: Trophy, activePath: `${root}/ranking` },
    { href: `${root}?aba=membros`, label: "Membros", icon: Users, view: "members", viewPath: root },
    { href: root, label: "Feed", icon: Home, activePath: root, view: "feed", viewPath: root },
    ...(canBuildSite
      ? ([{ href: `${root}/site`, label: "Site", icon: Globe, activePath: `${root}/site`, accent: true }] as SidebarItem[])
      : []),
  ]
}

function getInitials(name: string | null | undefined): string {
  if (!name) return "?"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

interface ContextBundle {
  /** Destino quando o user clica na foto. */
  homeHref: string
  /** Itens do toolbar. */
  items: SidebarItem[]
  /** Display name (perfil/clan) ou nome do user. */
  displayName: string
  /** URL do avatar quando disponível. */
  avatar_url: string | null
  /** Tag mostrada acima do nome quando contexto != user. */
  contextTag: string | null
}

function buildContextBundle(
  active: ActiveContext,
  user: { nome?: string | null; avatar?: string | null }
): ContextBundle {
  // O link e a foto do user são FIXOS no /account — não mudam por contexto.
  // Apenas os itens secundários (Ranking, Configurações) seguem o contexto ativo.
  const userBundle = {
    homeHref: "/account",
    contextTag: null as null,
    displayName: user.nome || "Perfil",
    avatar_url: user.avatar || null,
  }

  if (active.kind === "subprofile" && active.id_profile) {
    const root = `/account/profile/${active.id_profile}`
    return {
      ...userBundle,
      items: [
        ...ITENS_COMUNS,
        { href: `${root}?ranking=1`, label: "Ranking", icon: Trophy, activePath: root },
      ],
    }
  }
  if (active.kind === "clan" && active.id_profile) {
    return {
      ...userBundle,
      items: [
        ...ITENS_COMUNS,
        { href: `/clans/${active.id_profile}?ranking=1`, label: "Ranking", icon: Trophy },
      ],
    }
  }
  // Default: user
  return {
    ...userBundle,
    items: [
      ...ITENS_COMUNS,
      { href: "/ranking", label: "Ranking", icon: Trophy, matchPrefix: "/ranking" },
    ],
  }
}

export function ProfileSidebar() {
  const { user, status, logout } = useAuth()
  const pathname = usePathname() || "/"
  const router = useRouter()
  const active = useActiveContext()
  const shell = useCommunityShell()
  // Mesma flag que a página da comunidade lê para desenhar a aba Estante. Hook
  // solto (e não dentro de um `&&`) porque hook condicional viola rules-of-hooks.
  const shelfOn = useFeature("games_conexao")
  const [dropsideOpen, setDropsideOpen] = useState(false)
  const [dropsideEverOpened, setDropsideEverOpened] = useState(false)
  const navCounts = useNavCounts()
  const { registerAction } = useTour()

  useEffect(() => {
    const unregOpen = registerAction("openDropside", () => setDropsideOpen(true))
    const unregClose = registerAction("closeDropside", () => setDropsideOpen(false))
    return () => {
      unregOpen()
      unregClose()
    }
  }, [registerAction])

  // Latch do chunk lazy: primeira abertura monta o UserDropside e ele segue
  // montado (open=false) pra animação de fechar funcionar nas próximas.
  useEffect(() => {
    if (dropsideOpen) setDropsideEverOpened(true)
  }, [dropsideOpen])

  // Rede de segurança: a câmera adiciona `body.camera-active` (que faz
  // display:none na toolbar). O cleanup dela já remove a classe, mas se vazar
  // (ex.: erro no teardown), a toolbar ficaria "morta". Ao navegar, garantimos
  // que a classe não persiste — a câmera é um modal, então nunca está aberta
  // junto de uma troca de rota.
  useEffect(() => {
    document.body.classList.remove("camera-active")
  }, [pathname])

  // Em /account o avatar abre o dropside; em outras telas, navega pra /account.
  const isOnAccountHome = pathname === "/account"
  const handleTriggerClick = () => {
    if (isOnAccountHome) {
      setDropsideOpen(true)
    } else {
      router.push("/account")
    }
  }

  const isLoggedIn = status === "authenticated" && !!user

  const unreadSR = navCounts.serviceHasNew || navCounts.serviceUnread > 0

  if (HIDDEN_ON_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null
  }
  if (!isLoggedIn) return null

  const bundle = buildContextBundle(active, user)
  // Dentro de um ambiente a lista é OUTRA — não é a lista comum mais alguns
  // itens. Acrescentar em vez de trocar deixaria oito botões numa barra que no
  // celular já divide a largura com o polegar.
  const inShell = !!shell

  // Ambiente A Casa Views tem fundo claro (papel) — os ícones brancos da rail
  // somem. Escurece o contorno só nessas rotas; no hover (painel vira vidro
  // escuro) volta ao branco pra continuar legível.
  const isCasa = pathname.startsWith("/acasaviews")

  const isAdmin =
    !!user.is_admin ||
    !!user.roles?.some((r) => r.desc_role === "Administrator")
  // ⚠️ AMBIENTE NOVO = `kind` novo no `community-shell` E um caso aqui. Sem o
  // caso, a pessoa entraria no ambiente e continuaria com a barra da Freelandoo
  // — que é exatamente o que o ambiente troca.
  const shellItems = (s: Shell): SidebarItem[] =>
    s.kind === "games"
      ? buildGamesItems(s.communityId, shelfOn, s.gamerContext)
      : buildBusinessItems(s.communityId, s.canBuildSite)

  const baseItems: SidebarItem[] = shell ? shellItems(shell) : bundle.items
  const items: SidebarItem[] = isAdmin
    ? [
        ...baseItems,
        {
          href: "/admin",
          label: "Administração",
          icon: Crown,
          matchPrefix: "/admin",
          accent: true,
        },
      ]
    : baseItems

  return (
    <>
      <aside
        data-tour="sidebar-root"
        data-app-toolbar
        aria-label="Toolbar do perfil"
        className={cn(
          "group/sidebar fixed left-3 top-1/2 z-40 hidden -translate-y-1/2 md:flex",
          "w-14 flex-col gap-1 rounded-[22px] border border-white/10 bg-transparent p-1.5 shadow-none",
          "transition-[width,background-color,border-color] duration-300 ease-out",
          "hover:w-[216px] hover:border-white/20 hover:bg-zinc-950/55 hover:backdrop-blur-xl",
          isCasa && "border-zinc-900/25 [&_svg]:!text-zinc-900 group-hover/sidebar:border-white/20 group-hover/sidebar:[&_svg]:!text-white/85"
        )}
      >
        <span
          aria-hidden
          className="absolute -right-1 top-1/2 h-8 w-1.5 -translate-y-1/2 rounded-full bg-primary/40 opacity-50 transition-opacity group-hover/sidebar:opacity-100"
        />
        <ProfileTriggerButton
          bundle={bundle}
          onClick={handleTriggerClick}
          unread={unreadSR}
          exit={inShell}
        />

        <div className="mx-2 my-1 h-px bg-white/[0.07]" />

        {items.map((item) => (
          <ToolbarItemLink key={item.label} item={item} pathname={pathname} />
        ))}
      </aside>

      <nav
        aria-label="Toolbar do perfil"
        data-app-toolbar
        className={cn(
          "fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-transparent px-2 py-1.5 shadow-none md:hidden",
          isCasa && "border-zinc-900/25 bg-white/70 backdrop-blur [&_svg]:!text-zinc-900"
        )}
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <ProfileTriggerButton
          bundle={bundle}
          onClick={handleTriggerClick}
          unread={unreadSR}
          compact
          exit={inShell}
        />
        <span aria-hidden className="mx-0.5 h-7 w-px bg-white/[0.08]" />
        {items.map((item) => (
          <ToolbarItemLink key={item.label} item={item} pathname={pathname} compact />
        ))}
      </nav>

      {dropsideEverOpened && (
        <UserDropside
          open={dropsideOpen}
          onClose={() => setDropsideOpen(false)}
          user={user}
          unreadServiceRequest={unreadSR}
          onLogout={logout}
        />
      )}
    </>
  )
}

interface ProfileTriggerButtonProps {
  bundle: ContextBundle
  onClick: () => void
  unread?: boolean
  compact?: boolean
  /**
   * Dentro de um ambiente próprio (hoje, a plataforma de games) esta foto deixa
   * de ser "abrir meu menu" e passa a ser a PORTA DE VOLTA para a Freelandoo.
   * O amarelo é o que anuncia isso: sem ele, a única saída do ambiente seria
   * indistinguível do resto da barra.
   */
  exit?: boolean
}

function ProfileTriggerButton({ bundle, onClick, unread, compact, exit }: ProfileTriggerButtonProps) {
  return (
    <HoverHint id="sidebar-profile" side={compact ? "top" : "right"} className={compact ? undefined : "block w-full"}>
    <button
      data-tour="sidebar-profile"
      type="button"
      onClick={onClick}
      aria-label={`Menu de ${bundle.displayName}`}
      title="Abrir menu da conta"
      className={cn(
        "relative flex h-11 items-center gap-3 overflow-hidden rounded-full px-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-primary/10 hover:text-primary",
        compact && "h-10 w-10 justify-center px-0"
      )}
    >
      {exit && (
        <span aria-hidden className="absolute inset-y-0 left-0 w-11 bg-[#F2B705]" />
      )}
      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center">
        <Avatar className="h-8 w-8 ring-1 ring-primary/30">
          {bundle.avatar_url && (
            <AvatarImage src={bundle.avatar_url} alt={bundle.displayName} />
          )}
          <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
            {getInitials(bundle.displayName)}
          </AvatarFallback>
        </Avatar>
      </span>
      {!compact && (
        <span className="min-w-0 flex-1 whitespace-nowrap pr-2 text-left opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100">
          {bundle.contextTag && (
            <span className="block text-[10px] font-medium uppercase tracking-normal text-white/45">
              {bundle.contextTag}
            </span>
          )}
          <span className="block truncate text-sm font-semibold leading-tight">
            {bundle.displayName}
          </span>
        </span>
      )}
      {unread && (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-zinc-950" />
      )}
    </button>
    </HoverHint>
  )
}

function isItemActive(item: SidebarItem, pathname: string) {
  if (item.activePath) return pathname === item.activePath
  if (item.matchPrefix) {
    return pathname === item.matchPrefix || pathname.startsWith(item.matchPrefix + "/")
  }
  return pathname === item.href
}

interface ToolbarItemLinkProps {
  item: SidebarItem
  pathname: string
  compact?: boolean
}

function ToolbarItemLink({ item, pathname, compact }: ToolbarItemLinkProps) {
  const Icon = item.icon
  const active = isItemActive(item, pathname)
  const hintId: HintId | undefined =
    item.label === "Feed"
      ? "sidebar-feed"
      : item.label === "Bees"
        ? "sidebar-bees"
        : item.label === "Enxames"
          ? "sidebar-enxames"
          : item.label === "Mensagens"
            ? "sidebar-messages"
            : item.label === "Ranking"
              ? "sidebar-ranking"
              : item.label === "Administração"
                ? "sidebar-admin"
                : undefined

  const link = (
    <Link
      data-tour={hintId}
      href={item.href}
      aria-label={item.label}
      title={item.label}
      onClick={(e) => {
        // Já estamos na página que este item abriria: em vez de navegar (que
        // não faria nada), pede a vista para ela e acerta a URL sem sair.
        if (!item.view || !item.viewPath || pathname !== item.viewPath) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        requestCommunityView(item.view)
        // `replaceState` e não `router.replace`: só a barra de endereço muda,
        // para o F5 cair na mesma vista. Uma navegação de verdade re-renderizaria
        // a árvore inteira para trocar de aba.
        window.history.replaceState(null, "", item.href)
      }}
      className={cn(
        "relative flex h-11 items-center gap-3 overflow-hidden rounded-full px-1.5 text-sm font-medium transition-colors",
        active
          ? item.accent
            ? "bg-primary/15 text-primary"
            : "bg-white/10 text-white"
          : item.accent
            ? "text-primary hover:bg-primary/10"
            : "text-white/70 hover:bg-white/5 hover:text-white",
        compact && "h-10 w-10 justify-center px-0"
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center">
        <Icon
          className={cn("h-[18px] w-[18px]", item.accent && "text-primary")}
        />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate whitespace-nowrap pr-2 opacity-0 transition-opacity duration-200",
          compact ? "sr-only" : "group-hover/sidebar:opacity-100"
        )}
      >
        {item.label}
      </span>
    </Link>
  )

  if (hintId) {
    return (
      <HoverHint id={hintId} side={compact ? "top" : "right"} className={compact ? undefined : "block w-full"}>
        {link}
      </HoverHint>
    )
  }
  return link
}
