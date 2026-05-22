"use client"

import { io, Socket } from "socket.io-client"
import { getToken } from "@/lib/auth"

const DEFAULT_BACKEND = "https://freelandoo-backend-production.up.railway.app"

// Quanto tempo a aba pode ficar em background antes de a gente fechar o
// WebSocket pra liberar memória residual no Railway. Volta a conectar
// automaticamente ao foreground.
const IDLE_DISCONNECT_MS = 5 * 60 * 1000

function getRealtimeUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BACKEND
  return String(raw).replace(/\/$/, "")
}

let socket: Socket | null = null
let currentToken: string | null = null
let idleTimer: ReturnType<typeof setTimeout> | null = null

type Listener = (payload: unknown) => void
const handlers = new Map<string, Set<Listener>>()

// Subscriptions ativas (rooms que o user disse "quero ouvir"). Re-emitimos
// no `connect` da socket.io pra resistir a reconexão (idle + visible volta,
// rede caiu e voltou, server reiniciou, etc.). Sem isso, depois do server
// fechar/reabrir a thread ativa pararia de receber até a próxima
// navegação que dispare emitRealtime("conversation:subscribe", ...).
const subscriptions = new Map<string, { event: string; payload: unknown }>()
function subscriptionKey(event: string, payload: unknown): string {
  try {
    return `${event}:${JSON.stringify(payload ?? null)}`
  } catch {
    return `${event}:?`
  }
}
const SUBSCRIBE_EVENTS = new Set(["conversation:subscribe"])
const UNSUBSCRIBE_OF: Record<string, string> = {
  "conversation:unsubscribe": "conversation:subscribe",
}

function dispatch(event: string, payload: unknown) {
  const set = handlers.get(event)
  if (!set) return
  for (const fn of set) {
    try {
      fn(payload)
    } catch {
      /* listener throws are not fatal */
    }
  }
}

function ensureSocket(): Socket | null {
  if (typeof window === "undefined") return null
  const token = getToken()
  if (!token) {
    if (socket) {
      socket.disconnect()
      socket = null
      currentToken = null
    }
    return null
  }
  if (socket && currentToken === token) {
    if (!socket.connected) socket.connect()
    return socket
  }
  if (socket && currentToken !== token) {
    socket.disconnect()
    socket = null
  }
  if (socket) return socket

  currentToken = token
  socket = io(getRealtimeUrl(), {
    path: "/realtime",
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    reconnectionAttempts: Infinity,
    timeout: 10_000,
  })

  socket.on("connect_error", () => {
    /* silencioso — reconnection cuida disso */
  })

  // Re-emite subscriptions toda vez que reconectarmos (idle resume,
  // rede instável, server reiniciou). Idempotente do lado do server —
  // socket.join no mesmo room é no-op.
  socket.on("connect", () => {
    for (const { event, payload } of subscriptions.values()) {
      socket?.emit(event, payload)
    }
  })

  // Forward todos os eventos conhecidos para handlers locais.
  const events = [
    "conversation:message",
    "os:message",
    "notification:new",
    "nav-counts:changed",
  ]
  for (const ev of events) {
    socket.on(ev, (payload: unknown) => dispatch(ev, payload))
  }

  return socket
}

export function getRealtimeSocket(): Socket | null {
  return ensureSocket()
}

export function onRealtime(event: string, listener: Listener): () => void {
  ensureSocket()
  let set = handlers.get(event)
  if (!set) {
    set = new Set()
    handlers.set(event, set)
  }
  set.add(listener)
  return () => {
    set?.delete(listener)
  }
}

export function emitRealtime(event: string, payload?: unknown) {
  // Track subscriptions pra re-emitir no `connect` (ver acima).
  if (SUBSCRIBE_EVENTS.has(event)) {
    subscriptions.set(subscriptionKey(event, payload), { event, payload })
  } else if (UNSUBSCRIBE_OF[event]) {
    subscriptions.delete(subscriptionKey(UNSUBSCRIBE_OF[event], payload))
  }
  const s = ensureSocket()
  if (s) s.emit(event, payload)
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect()
    socket = null
    currentToken = null
  }
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  subscriptions.clear()
}

// ─── Visibility-aware idle disconnect ─────────────────────────────────────
// Quando a aba fica em background, agenda o fechamento do WS após 5 min.
// Volta ao foreground → cancela o timer e reabre na hora se já fechou.
// Não usa setInterval — só timeout disparado pelo evento visibilitychange.
function onIdleDisconnect() {
  if (!socket) return
  if (!socket.connected) return
  // socket.disconnect() mantém a instância e os listeners. socket.connect()
  // depois reabre. As subscriptions são re-emitidas no `connect` automático.
  socket.disconnect()
}

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

function handleVisibilityChange() {
  if (typeof document === "undefined") return
  if (document.hidden) {
    // Aba foi pra background. Agenda o fechamento.
    clearIdleTimer()
    idleTimer = setTimeout(onIdleDisconnect, IDLE_DISCONNECT_MS)
  } else {
    // Voltou ao foreground. Cancela o timer e reabre se fechou.
    clearIdleTimer()
    if (socket && !socket.connected) {
      socket.connect()
    } else if (!socket) {
      ensureSocket()
    }
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:changed", () => {
    if (socket) {
      socket.disconnect()
      socket = null
      currentToken = null
    }
    clearIdleTimer()
    subscriptions.clear()
    ensureSocket()
  })
  document.addEventListener("visibilitychange", handleVisibilityChange)
}
