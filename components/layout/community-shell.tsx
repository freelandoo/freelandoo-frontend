"use client"

/**
 * O AMBIENTE DE COMUNIDADE — quem avisa o dock de que a barra de baixo mudou.
 *
 * Nasceu para a plataforma de GAMES e passou a servir também "Meus negócios"
 * (2026-09-08), que é a comunidade de modalidade `common`. Os dois são
 * AMBIENTES: lugares onde a barra da Freelandoo inteira dá lugar aos controles
 * daquele espaço.
 *
 * ─── O PROBLEMA ──────────────────────────────────────────────────────────────
 *
 * O dock (`ProfileSidebar`) é global: mora no layout raiz e se desenha em toda
 * rota. Dentro de um ambiente ele precisa trocar de conteúdo inteiro, e para
 * isso precisa saber em que ambiente está.
 *
 * Pelo caminho (`usePathname`) ele NÃO tem como saber: `/comunidades/<uuid>`
 * serve todas as modalidades, e a modalidade só aparece depois que a página
 * busca a comunidade. A alternativa seria o dock fazer essa busca por conta
 * própria — uma requisição a mais em TODA visita a qualquer comunidade, para
 * responder a uma pergunta que a página ao lado já respondeu.
 *
 * ─── A SOLUÇÃO: QUEM SABE, DECLARA ───────────────────────────────────────────
 *
 * Quem já tem a resposta é a PÁGINA. Ela monta o `<CommunityShellBeacon>`
 * dizendo QUAL ambiente é, e o dock lê. É a mesma disciplina do
 * `platform-chrome`: quem declara o ambiente é a página, nunca um palpite sobre
 * o pathname — lá isso importava porque subdomínio e domínio próprio chegam por
 * reescrita; aqui, porque a modalidade não está na URL.
 *
 * ⚠️ AMBIENTE NOVO = `kind` novo aqui E a lista de itens correspondente no
 * `ProfileSidebar`. Um `kind` sem lista deixaria a pessoa dentro do ambiente
 * com a barra da Freelandoo, que é justamente o que o ambiente troca.
 *
 * ─── POR QUE UMA LOJA DE MÓDULO, E NÃO UM CONTEXT ────────────────────────────
 *
 * Um Context precisaria de um Provider no layout raiz envolvendo tudo, e a
 * página (que é filha) não teria como escrever nele sem outro nível de estado.
 * A loja aqui é lida com `useSyncExternalStore`, que é a porta oficial do React
 * para estado que vive fora dele — sem tearing e sem re-render de árvore.
 *
 * ─── A ARMADILHA DA TROCA DE PÁGINA ──────────────────────────────────────────
 *
 * Navegar de `/comunidades/<id>` para `/comunidades/<id>/posts` desmonta um
 * beacon e monta outro, e a ordem entre as duas coisas não é garantida. Com uma
 * variável só, o cleanup do antigo apagaria o registro do novo e o dock voltaria
 * ao normal no meio do ambiente. Por isso o registro é um MAPA de instâncias
 * vivas: sai a que morreu, e o ambiente só acaba quando não sobra nenhuma.
 *
 * ─── A SEGUNDA FUNÇÃO: A BATIDA DE PRESENÇA (mig 226) ────────────────────────
 *
 * O ranking de atividade da plataforma de games conta, entre outras coisas, o
 * TEMPO ONLINE dentro do ambiente. Quem sabe que a pessoa está ali dentro é
 * exatamente este registro — o mesmo que o dock lê —, então a batida nasce aqui
 * e não numa tela específica: pendurada numa página, mudar de tela dentro do
 * ambiente pararia o relógio, e uma tela nova nasceria sem contar tempo.
 *
 * O relógio é do MAPA, não do componente: navegar entre duas telas do ambiente
 * troca beacons sem interromper a contagem, e ela só para quando o último sai.
 *
 * ⚠️ AQUI DENTRO, SÓ GAMES BATE. "Meus negócios" é ambiente e troca o dock, mas
 * não tem ranking próprio: contar o tempo de quem está lá daria pontuação de
 * games a quem nunca entrou em games.
 *
 * O Financeiro também mede tempo desde a mig 230, mas ele NÃO passa por aqui —
 * a Carteira não é uma comunidade na tela, e quem declara a presença dela é o
 * headcard dela, com o mesmo `platform-presence`. O que os dois compartilham é
 * o relógio; o que decide quando ligá-lo é de cada ambiente.
 */

import { useEffect } from "react"
import { useSyncExternalStore } from "react"
import { claimPresence } from "@/components/layout/platform-presence"

/* ─────────────────────────── batida de presença ────────────────────────────
 *
 * O relógio em si MUDOU DE CASA (2026-09-08): mora em
 * `components/layout/platform-presence.ts`, porque o Financeiro passou a medir
 * tempo também e as duas plataformas têm que bater do mesmo jeito. O que
 * continua aqui é só a decisão de QUANDO ligar — que é o que este módulo sabe
 * e o outro não.
 */

/** O release do claim de games, enquanto ele estiver ligado. */
let gamesRelease: (() => void) | null = null

/* ────────────────────── o que o dock PEDE para a página ─────────────────────
 *
 * Os itens do dock apontam para a MESMA página do ambiente com um parâmetro
 * dizendo o que abrir (`?aba=membros`, `?painel=mural`) — não são telas
 * próprias. Vindo de outra rota isso funciona sozinho: a página monta e lê o
 * parâmetro do window.
 *
 * ⚠️ JÁ ESTANDO NA PÁGINA, NÃO FUNCIONAVA. Trocar só a querystring da MESMA
 * rota não desmonta nem remonta o componente, e a leitura do deep-link roda uma
 * vez só (é ela que decide a aba inicial). O resultado era o pior tipo de
 * botão: ele existia, aceitava o clique, a URL mudava — e a tela ficava igual.
 *
 * A saída não é ler a querystring a cada render: `useSearchParams` obriga
 * Suspense e tira a rota do pré-render (o build já quebrou assim com
 * `?tipo=condo`). Quem sabe o que foi pedido é o DOCK, então ele DIZ, pelo
 * mesmo canal por onde a página já lhe diz que o ambiente existe — este
 * módulo. O pedido é um evento, não estado: ele acontece uma vez e não tem
 * "valor atual" que alguém possa reler depois.
 *
 * A URL continua sendo trocada (por `history.replaceState`, sem navegar), para
 * que recarregar a página caia na mesma vista — se ela mentisse, o F5 devolveria
 * o feed depois de a pessoa ter aberto a Estante.
 */

/** O que o dock consegue pedir. Vista nova = nome novo AQUI e o caso
 *  correspondente em quem escuta (a página da comunidade). */
export type CommunityView = "feed" | "members" | "shelf" | "game" | "profile" | "mural"

const viewListeners = new Set<(v: CommunityView) => void>()

/** Chamado pelo dock. Sem ninguém escutando é no-op — e é o que tem que ser:
 *  significa que a página do ambiente não está montada, e nesse caso o clique
 *  já vai navegar de verdade. */
export function requestCommunityView(view: CommunityView) {
  for (const l of [...viewListeners]) l(view)
}

/** Assinado pela página do ambiente. */
export function onCommunityView(cb: (v: CommunityView) => void): () => void {
  viewListeners.add(cb)
  return () => {
    viewListeners.delete(cb)
  }
}

/** Os ambientes que trocam o dock. */
export type ShellKind = "games" | "business"

export type Shell = {
  communityId: string
  kind: ShellKind
  /**
   * Se quem está olhando pode construir o site desta comunidade — ou seja, é o
   * líder. É o dock que precisa saber, e ele não tem como descobrir: a resposta
   * mistura modalidade, papel e flag, e mora na página (`canBuildSite`).
   */
  canBuildSite: boolean
  /**
   * O @username do dono do recorte, quando se está visitando o games de
   * alguém. O dock precisa saber pelo mesmo motivo que precisa do
   * `canBuildSite`: ele não tem como descobrir — a resposta chega por
   * querystring numa rota que ele não lê —, e sem ela o item "Posts games"
   * navegaria para os posts de QUEM OLHA de dentro do games de outra pessoa,
   * enquanto o pill ciano ao lado abre os dela. Os outros itens do ambiente
   * não precisam: "Estante" e "Jogo atual" não navegam, pedem a vista à
   * página que já está no contexto.
   */
  gamerContext?: string | null
}

/** Beacons vivos, por token de instância. O ambiente é o último a entrar. */
const mounted = new Map<number, Shell>()
let token = 0
let snapshot: Shell | null = null

const listeners = new Set<() => void>()

function same(a: Shell | null, b: Shell | null) {
  if (!a || !b) return a === b
  return (
    a.communityId === b.communityId &&
    a.kind === b.kind &&
    a.canBuildSite === b.canBuildSite &&
    (a.gamerContext ?? null) === (b.gamerContext ?? null)
  )
}

function recompute() {
  const next = [...mounted.values()].pop() ?? null

  // O relógio segue o MAPA, não o snapshot: trocar de tela dentro do ambiente
  // troca beacons sem parar a contagem, e sair de vez esvazia o mapa. É por
  // isso que a decisão está aqui em cima e não no comparador de identidade
  // abaixo — que devolve cedo quando nada mudou.
  //
  // Só GAMES conta tempo (ver o cabeçalho): quem está em "Meus negócios" não
  // pode pontuar num ranking de games.
  const games = [...mounted.values()].some((s) => s.kind === "games")
  if (games && !gamesRelease) gamesRelease = claimPresence("games")
  else if (!games && gamesRelease) {
    gamesRelease()
    gamesRelease = null
  }

  // Identidade estável: `useSyncExternalStore` compara por referência, e um
  // objeto novo a cada leitura faria o dock re-renderizar para sempre.
  if (same(next, snapshot)) return
  snapshot = next
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

function getSnapshot() {
  return snapshot
}

/** No servidor o ambiente nunca está ativo: quem o liga é um efeito. */
function getServerSnapshot(): Shell | null {
  return null
}

/** Lido pelo dock. `null` = fora de qualquer ambiente. */
export function useCommunityShell(): Shell | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Montado pelas telas de um ambiente. Não desenha nada — só declara.
 */
export function CommunityShellBeacon({
  communityId,
  kind,
  canBuildSite = false,
  gamerContext = null,
}: {
  communityId: string
  kind: ShellKind
  canBuildSite?: boolean
  gamerContext?: string | null
}) {
  useEffect(() => {
    const id = ++token
    mounted.set(id, { communityId, kind, canBuildSite, gamerContext })
    recompute()
    return () => {
      mounted.delete(id)
      recompute()
    }
  }, [communityId, kind, canBuildSite, gamerContext])
  return null
}
