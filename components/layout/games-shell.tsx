"use client"

/**
 * O AMBIENTE GAMES — quem avisa o dock de que a barra de baixo mudou.
 *
 * ─── O PROBLEMA ──────────────────────────────────────────────────────────────
 *
 * O dock (`ProfileSidebar`) é global: mora no layout raiz e se desenha em toda
 * rota. Dentro da plataforma de games ele precisa trocar de conteúdo inteiro —
 * Feed, Estante, Jogo atual, Posts games e o Game —, e para isso precisa saber
 * que a rota atual é uma comunidade de GAMES.
 *
 * Pelo caminho (`usePathname`) ele NÃO tem como saber: `/comunidades/<uuid>`
 * serve todas as modalidades, e a modalidade só aparece depois que a página
 * busca a comunidade. A alternativa seria o dock fazer essa busca por conta
 * própria — uma requisição a mais em TODA visita a qualquer comunidade, para
 * responder a uma pergunta que a página ao lado já respondeu.
 *
 * ─── A SOLUÇÃO: QUEM SABE, DECLARA ───────────────────────────────────────────
 *
 * Quem já tem a resposta é a PÁGINA. Ela monta o `<GamesShellBeacon>` quando
 * sabe que está em games, e o dock lê. É a mesma disciplina do
 * `platform-chrome`: quem declara o ambiente é a página, nunca um palpite sobre
 * o pathname — lá isso importava porque subdomínio e domínio próprio chegam por
 * reescrita; aqui, porque a modalidade não está na URL.
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
 * O ranking de atividade da plataforma conta, entre outras coisas, o TEMPO
 * ONLINE dentro do ambiente de games. Quem sabe que a pessoa está ali dentro é
 * exatamente este registro — o mesmo que o dock lê —, então a batida nasce aqui
 * e não numa tela específica: pendurada numa página, mudar de tela dentro do
 * ambiente pararia o relógio, e uma tela nova nasceria sem contar tempo.
 *
 * O relógio é do MAPA, não do componente: navegar entre duas telas do ambiente
 * troca beacons sem interromper a contagem, e ela só para quando o último sai.
 */

import { useEffect } from "react"
import { useSyncExternalStore } from "react"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"

/* ─────────────────────────── batida de presença ────────────────────────────
 *
 * ⚠️ VAI DIRETO NO RAILWAY, nunca pelo proxy `/api/*` da Vercel. É chamada
 * recorrente, e cada passagem pelo proxy cobraria uma invocação por batida de
 * cada pessoa online — a regra que já vale para o heartbeat de XP e para o
 * chat. Assim ela custa zero na Vercel.
 *
 * ⚠️ SÓ COM A ABA VISÍVEL. Presença é a pessoa olhando para a tela; aba de
 * fundo esquecida por um dia não é tempo de ninguém. Quem mede de fato é o
 * banco (o crédito sai do intervalo entre duas batidas, com teto), então esta
 * ponta só precisa dizer a verdade sobre quando está olhando.
 */

/** 2 minutos. O backend tolera até 180s por batida — a folga é a jitter. */
const BEAT_MS = 120_000

let beatTimer: ReturnType<typeof setInterval> | null = null
let beatCleanup: (() => void) | null = null

/**
 * `resume` = "não credite, só acerte o relógio".
 *
 * Existe para o retorno de uma aba que ficou escondida: sem ele, a primeira
 * batida depois de voltar creditaria o teto de uma batida (3 min) de um tempo
 * em que ninguém estava olhando. Um cliente adulterado que mandasse `resume`
 * sempre só diminuiria a própria pontuação — a fraude possível aqui é contra si
 * mesmo, e por isso a flag pode vir do cliente sem risco.
 */
function sendBeat(resume: boolean, keepalive = false) {
  const token = getToken()
  if (!token) return
  const url = `${getPublicBackendUrl()}/gamer/presence${resume ? "?resume=1" : ""}`
  // `keepalive` (e não sendBeacon) porque a batida precisa do Authorization, e
  // o sendBeacon não manda cabeçalho. Com keepalive o pedido sobrevive ao
  // fechamento da aba.
  void fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    keepalive,
  }).catch(() => {
    /* silencioso: perder uma batida custa 2 minutos de ranking, não a tela */
  })
}

function startHeartbeat() {
  if (beatTimer) return

  const visible = () =>
    typeof document === "undefined" || document.visibilityState === "visible"

  if (visible()) sendBeat(false)

  beatTimer = setInterval(() => {
    if (visible()) sendBeat(false)
  }, BEAT_MS)

  const onVisibility = () => {
    // Escondeu: fecha as contas com o tempo REAL até agora.
    // Voltou: só acerta o relógio, sem creditar o tempo em que sumiu.
    if (visible()) sendBeat(true)
    else sendBeat(false, true)
  }
  // `pagehide` e não `unload`: em iOS o unload não dispara, e a última batida
  // (que é a que credita o tempo desde a penúltima) se perderia.
  const onPageHide = () => sendBeat(false, true)

  document.addEventListener("visibilitychange", onVisibility)
  window.addEventListener("pagehide", onPageHide)

  beatCleanup = () => {
    document.removeEventListener("visibilitychange", onVisibility)
    window.removeEventListener("pagehide", onPageHide)
  }
}

function stopHeartbeat() {
  if (!beatTimer) return
  clearInterval(beatTimer)
  beatTimer = null
  beatCleanup?.()
  beatCleanup = null
  // Saiu do ambiente: credita o trecho final antes de largar o relógio.
  sendBeat(false, true)
}

/* ────────────────────── o que o dock PEDE para a página ────────────────────
 *
 * "Estante" e "Jogo atual" no dock são DEEP-LINKS para a mesma página do
 * ambiente (`?aba=estante`, `?painel=jogo`) — não são telas próprias. Vindo de
 * outra rota isso funciona sozinho: a página monta e lê o parâmetro do window.
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

/** O que o dock consegue pedir. Vista nova do ambiente = nome novo AQUI e o
 *  caso correspondente em quem escuta (a página da comunidade). */
export type GamesView = "feed" | "shelf" | "game"

const viewListeners = new Set<(v: GamesView) => void>()

/** Chamado pelo dock. Sem ninguém escutando é no-op — e é o que tem que ser:
 *  significa que a página do ambiente não está montada, e nesse caso o clique
 *  já vai navegar de verdade. */
export function requestGamesView(view: GamesView) {
  for (const l of [...viewListeners]) l(view)
}

/** Assinado pela página do ambiente. */
export function onGamesView(cb: (v: GamesView) => void): () => void {
  viewListeners.add(cb)
  return () => {
    viewListeners.delete(cb)
  }
}

type Shell = { communityId: string }

/** Beacons vivos, por token de instância. O ambiente é o último a entrar. */
const mounted = new Map<number, string>()
let token = 0
let snapshot: Shell | null = null

const listeners = new Set<() => void>()

function recompute() {
  const last = [...mounted.values()].pop() ?? null
  const next = last ? { communityId: last } : null

  // O relógio segue o MAPA, não o snapshot: trocar de tela dentro do ambiente
  // muda o `communityId` (ou nem isso) sem parar a contagem, e sair de vez
  // esvazia o mapa. É por isso que a decisão está aqui em cima e não no
  // comparador de identidade abaixo — que devolve cedo quando nada mudou.
  if (mounted.size > 0) startHeartbeat()
  else stopHeartbeat()

  // Identidade estável: `useSyncExternalStore` compara por referência, e um
  // objeto novo a cada leitura faria o dock re-renderizar para sempre.
  if (next?.communityId === snapshot?.communityId) return
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

/** Lido pelo dock. `null` = fora do ambiente games. */
export function useGamesShell(): Shell | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Montado pelas telas da plataforma de games. Não desenha nada — só declara.
 */
export function GamesShellBeacon({ communityId }: { communityId: string }) {
  useEffect(() => {
    const id = ++token
    mounted.set(id, communityId)
    recompute()
    return () => {
      mounted.delete(id)
      recompute()
    }
  }, [communityId])
  return null
}
