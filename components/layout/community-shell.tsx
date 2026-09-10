"use client"

/**
 * O AMBIENTE DE COMUNIDADE — quem avisa o dock de que a barra de baixo mudou.
 *
 * Nasceu para a plataforma de GAMES e passou a servir "Meus negócios"
 * (2026-09-08), a comunidade de modalidade `common` — que hoje é o único
 * AMBIENTE que sobrou: um lugar onde a barra da Freelandoo inteira dá lugar
 * aos controles daquele espaço.
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
 * Navegar de `/comunidades/<id>` para `/comunidades/<id>/ranking` desmonta um
 * beacon e monta outro, e a ordem entre as duas coisas não é garantida. Com uma
 * variável só, o cleanup do antigo apagaria o registro do novo e o dock voltaria
 * ao normal no meio do ambiente. Por isso o registro é um MAPA de instâncias
 * vivas: sai a que morreu, e o ambiente só acaba quando não sobra nenhuma.
 *
 * ─── A BATIDA DE PRESENÇA SAIU DAQUI ─────────────────────────────────────────
 *
 * Este módulo também ligava o relógio de presença da plataforma de games (mig
 * 226): quem sabia que a pessoa estava dentro do ambiente era este registro, o
 * mesmo que o dock lê. Com o frontend de games apagado (2026-09-09) não há
 * mais ranking de atividade a alimentar por aqui, e "Meus negócios" — o
 * ambiente que sobrou — nunca bateu: ele troca o dock, mas não tem ranking
 * próprio.
 *
 * ⚠️ O RELÓGIO EM SI CONTINUA VIVO em `components/layout/platform-presence.ts`,
 * e é o FINANCEIRO quem o usa (mig 230). Ele nunca passou por aqui — a Carteira
 * não é uma comunidade na tela, e quem declara a presença dela é o headcard
 * dela. Ambiente novo que precise contar tempo liga `claimPresence` de novo.
 */

import { useEffect } from "react"
import { useSyncExternalStore } from "react"

/* ─────────────────────────── batida de presença ────────────────────────────
 *
 * O relógio em si MUDOU DE CASA (2026-09-08): mora em
 * `components/layout/platform-presence.ts`, porque o Financeiro passou a medir
 * tempo também e as duas plataformas têm que bater do mesmo jeito. O que
 * continua aqui é só a decisão de QUANDO ligar — que é o que este módulo sabe
 * e o outro não.
 */

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
export type CommunityView = "feed" | "members" | "profile" | "mural"

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

/**
 * Os ambientes que trocam o dock.
 *
 * ⚠️ ERAM DOIS. `games` foi APAGADO quando o frontend daquela plataforma saiu
 * inteiro (2026-09-09) — o tipo é uma união de um só membro de propósito, e não
 * uma string solta: ambiente novo entra AQUI e ganha o caso correspondente no
 * `ProfileSidebar`. Um kind sem lista deixaria a pessoa dentro do ambiente com
 * a barra da Freelandoo, que é justamente o que o ambiente troca.
 */
export type ShellKind = "business"

export type Shell = {
  communityId: string
  kind: ShellKind
  /**
   * Se quem está olhando pode construir o site desta comunidade — ou seja, é o
   * líder. É o dock que precisa saber, e ele não tem como descobrir: a resposta
   * mistura modalidade, papel e flag, e mora na página (`canBuildSite`).
   */
  canBuildSite: boolean
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
    a.canBuildSite === b.canBuildSite
  )
}

function recompute() {
  const next = [...mounted.values()].pop() ?? null

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
}: {
  communityId: string
  kind: ShellKind
  canBuildSite?: boolean
}) {
  useEffect(() => {
    const id = ++token
    mounted.set(id, { communityId, kind, canBuildSite })
    recompute()
    return () => {
      mounted.delete(id)
      recompute()
    }
  }, [communityId, kind, canBuildSite])
  return null
}
