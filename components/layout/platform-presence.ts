"use client"

/**
 * A BATIDA DE PRESENÇA — quanto tempo a pessoa passou DENTRO de um ambiente.
 *
 * Nasceu dentro do `community-shell` (mig 226), servindo só a plataforma de
 * games, e saiu de lá quando o Alex pediu o ranking do Financeiro "com o mesmo
 * parâmetro do games — likes, comentários, tempo online apenas dentro da
 * plataforma financeira" (2026-09-08). São dois ambientes agora, e o relógio é
 * o mesmo mecanismo com dois destinos: escrito de novo do lado da Carteira, o
 * primeiro ajuste de teto, de intervalo ou de `resume` valeria num e não no
 * outro, e a divergência só apareceria como ranking torto semanas depois.
 *
 * ─── O QUE ESTA PONTA FAZ, E O QUE ELA NÃO FAZ ──────────────────────────────
 *
 * Ela só diz "ainda estou aqui". QUEM MEDE É O BANCO: o crédito sai do
 * intervalo desde a última batida, com teto por batida e por dia
 * (utils/gamesScore.js, do lado do servidor). Um cliente que dissesse quanto
 * tempo passou poderia dizer qualquer coisa.
 *
 * ⚠️ VAI DIRETO NO RAILWAY, nunca pelo proxy `/api/*` da Vercel. É chamada
 * recorrente, e cada passagem pelo proxy cobraria uma invocação por batida de
 * cada pessoa online — a regra que já vale para o heartbeat de XP e para o
 * chat. Assim ela custa zero na Vercel.
 *
 * ⚠️ SÓ COM A ABA VISÍVEL. Presença é a pessoa olhando para a tela; aba de
 * fundo esquecida por um dia não é tempo de ninguém.
 *
 * ─── POR QUE UM MAPA DE CLAIMS, E NÃO UM BOOLEANO ───────────────────────────
 *
 * Navegar entre duas telas do MESMO ambiente (de `/wallet` para
 * `/wallet/carteira`, de `/comunidades/<id>` para `/comunidades/<id>/posts`)
 * desmonta um componente e monta outro, e a ordem entre as duas coisas não é
 * garantida. Com um booleano, o cleanup do que morreu apagaria o registro do
 * que acabou de nascer e o relógio pararia no meio do ambiente. Com o mapa, o
 * ambiente só acaba quando não sobra nenhum registro vivo.
 *
 * ⚠️ PLATAFORMA NOVA = uma entrada em `ENDPOINT` aqui e a rota correspondente
 * no backend. Sem a entrada, `usePlatformPresence` seria um no-op silencioso e
 * a fila da plataforma nasceria sem o tempo — que é exatamente o estado em que
 * o Financeiro passou os primeiros dias.
 */

import { useEffect } from "react"
import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"

/**
 * Os ambientes que medem tempo. Espelho de PLATFORM_KINDS no backend.
 *
 * ⚠️ ERAM DOIS. `games` saiu quando a plataforma foi retirada do ar
 * (2026-09-09): ninguém mais chamava `claimPresence("games")`, e um kind no
 * mapa sem quem o peça é um endpoint anunciado que nada alcança. O backend
 * continua aceitando `/gamer/presence` — o que sumiu é a batida deste lado.
 */
export type PresenceKind = "finance"

/** Onde cada uma recebe a batida. */
const ENDPOINT: Record<PresenceKind, string> = {
  finance: "/finance/presence",
}

/** 2 minutos. O backend tolera até 180s por batida — a folga é a jitter. */
const BEAT_MS = 120_000

type Beat = { timer: ReturnType<typeof setInterval>; cleanup: () => void }

/** Relógios ligados, um por plataforma. */
const beats = new Map<PresenceKind, Beat>()

/** Quem declarou estar dentro de um ambiente. A chave é a instância. */
const claims = new Map<number, PresenceKind>()
let seq = 0

/**
 * `resume` = "não credite, só acerte o relógio".
 *
 * Existe para o retorno de uma aba que ficou escondida: sem ele, a primeira
 * batida depois de voltar creditaria o teto de uma batida (3 min) de um tempo
 * em que ninguém estava olhando. Um cliente adulterado que mandasse `resume`
 * sempre só diminuiria a própria pontuação — a fraude possível aqui é contra si
 * mesmo, e por isso a flag pode vir do cliente sem risco.
 */
function sendBeat(kind: PresenceKind, resume: boolean, keepalive = false) {
  const token = getToken()
  if (!token) return
  const url = `${getPublicBackendUrl()}${ENDPOINT[kind]}${resume ? "?resume=1" : ""}`
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

function startHeartbeat(kind: PresenceKind) {
  if (beats.has(kind)) return

  const visible = () =>
    typeof document === "undefined" || document.visibilityState === "visible"

  if (visible()) sendBeat(kind, false)

  const timer = setInterval(() => {
    if (visible()) sendBeat(kind, false)
  }, BEAT_MS)

  const onVisibility = () => {
    // Escondeu: fecha as contas com o tempo REAL até agora.
    // Voltou: só acerta o relógio, sem creditar o tempo em que sumiu.
    if (visible()) sendBeat(kind, true)
    else sendBeat(kind, false, true)
  }
  // `pagehide` e não `unload`: em iOS o unload não dispara, e a última batida
  // (que é a que credita o tempo desde a penúltima) se perderia.
  const onPageHide = () => sendBeat(kind, false, true)

  document.addEventListener("visibilitychange", onVisibility)
  window.addEventListener("pagehide", onPageHide)

  beats.set(kind, {
    timer,
    cleanup: () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
    },
  })
}

function stopHeartbeat(kind: PresenceKind) {
  const beat = beats.get(kind)
  if (!beat) return
  clearInterval(beat.timer)
  beat.cleanup()
  beats.delete(kind)
  // Saiu do ambiente: credita o trecho final antes de largar o relógio.
  sendBeat(kind, false, true)
}

function recompute() {
  const live = new Set(claims.values())
  for (const kind of Object.keys(ENDPOINT) as PresenceKind[]) {
    if (live.has(kind)) startHeartbeat(kind)
    else stopHeartbeat(kind)
  }
}

/**
 * Declara que a pessoa está dentro do ambiente. Devolve o release.
 *
 * A forma imperativa existe para quem já mantém o próprio registro de telas
 * vivas — é o caso do `community-shell`, que descobre o ambiente pela
 * modalidade da comunidade e não por estar montado. Quem só precisa dizer
 * "esta tela é do ambiente" usa o hook abaixo.
 */
export function claimPresence(kind: PresenceKind): () => void {
  const id = ++seq
  claims.set(id, kind)
  recompute()
  return () => {
    claims.delete(id)
    recompute()
  }
}

/** Montado por uma tela que É o ambiente. Não desenha nada — só declara. */
export function usePlatformPresence(kind: PresenceKind) {
  useEffect(() => claimPresence(kind), [kind])
}
