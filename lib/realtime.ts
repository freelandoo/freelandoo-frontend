"use client"

import { io, Socket } from "socket.io-client"
import { getToken } from "@/lib/auth"

const DEFAULT_BACKEND = "https://freelandoo-backend-production.up.railway.app"

function getRealtimeUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    DEFAULT_BACKEND
  return String(raw).replace(/\/$/, "")
}

let socket: Socket | null = null
let currentToken: string | null = null

type Listener = (payload: unknown) => void
const handlers = new Map<string, Set<Listener>>()

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
  if (socket && currentToken === token && socket.connected) return socket
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
  const s = ensureSocket()
  if (s) s.emit(event, payload)
}

export function disconnectRealtime() {
  if (socket) {
    socket.disconnect()
    socket = null
    currentToken = null
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("auth:changed", () => {
    if (socket) {
      socket.disconnect()
      socket = null
      currentToken = null
    }
    ensureSocket()
  })
}
