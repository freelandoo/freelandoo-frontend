"use client"

// O lado do /feed no Feed Interativo: para quem eu lanço (alvos), lançar, e a
// FILA do que outros lançaram para mim — que entra no feed UM POR VEZ e só
// quando a pessoa não está ocupada.
//
// Não interromper quando: aba escondida; digitando (input/textarea/editável);
// algum diálogo aberto ([role=dialog] / [aria-modal]); comentários, stories ou
// composer abertos (`blocked`); post no meio de um gesto; ou a pessoa mexeu na
// tela há menos de 900 ms. Espaço mínimo de 4 s entre duas chegadas.
//
// Socket: `fi:drop` (chegou algo) e `fi:links` (lista de alvos mudou) — sem
// poll. A inbox é relida ao montar e a cada aviso.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { onRealtime } from "@/lib/realtime"
import { fxApi, type FxDrop } from "@/lib/feed-fx/api"
import type { ThrowResult, ThrowTarget } from "./gesture-post"

const QUIET_MS = 900
const GAP_MS = 4000
const TICK_MS = 700

function domBusy(): boolean {
  if (typeof document === "undefined") return true
  if (document.hidden) return true
  const a = document.activeElement as HTMLElement | null
  if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT" || a.isContentEditable)) return true
  if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return true
  if (document.body.dataset.fxGesture === "1") return true
  return false
}

interface Options {
  enabled: boolean
  scrollRef: RefObject<HTMLElement | null>
  /** Telas da própria página que pedem silêncio (comentários, story, composer). */
  blocked: boolean
  /** A página encaixa o drop na lista (logo depois do post que está na tela). */
  inject: (drop: FxDrop) => boolean
}

export function useFeedInterativo({ enabled, scrollRef, blocked, inject }: Options) {
  const [targets, setTargets] = useState<ThrowTarget[]>([])
  const queue = useRef<FxDrop[]>([])
  const known = useRef(new Set<string>())
  const lastTouch = useRef(0)
  const lastDrop = useRef(0)
  const blockedRef = useRef(blocked)
  const injectRef = useRef(inject)
  const [queued, setQueued] = useState(0)
  useEffect(() => {
    blockedRef.current = blocked
    injectRef.current = inject
  })

  const loadTargets = useCallback(async () => {
    try {
      const r = await fxApi<{ targets: ThrowTarget[] }>("/targets")
      setTargets(r.targets || [])
    } catch {
      setTargets([])
    }
  }, [])

  const loadInbox = useCallback(async () => {
    try {
      const r = await fxApi<{ items: FxDrop[] }>("/inbox")
      for (const d of r.items || []) {
        if (known.current.has(d.id_drop)) continue
        known.current.add(d.id_drop)
        queue.current.push(d)
      }
      setQueued(queue.current.length)
    } catch {
      /* sem rede: tenta no próximo aviso */
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    void loadTargets()
    void loadInbox()
    let t: ReturnType<typeof setTimeout> | null = null
    const offDrop = onRealtime("fi:drop", () => {
      if (t) clearTimeout(t)
      t = setTimeout(() => void loadInbox(), 250)
    })
    const offLinks = onRealtime("fi:links", () => void loadTargets())
    return () => {
      offDrop()
      offLinks()
      if (t) clearTimeout(t)
    }
  }, [enabled, loadTargets, loadInbox])

  // Mexeu na tela = ocupado por um instante.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || !enabled) return
    const mark = () => {
      lastTouch.current = performance.now()
    }
    el.addEventListener("scroll", mark, { passive: true })
    el.addEventListener("pointerdown", mark, { passive: true })
    el.addEventListener("touchstart", mark, { passive: true })
    return () => {
      el.removeEventListener("scroll", mark)
      el.removeEventListener("pointerdown", mark)
      el.removeEventListener("touchstart", mark)
    }
  }, [scrollRef, enabled])

  // Relógio curto SÓ enquanto há fila (não é poll de rede: só decide a hora de encaixar).
  useEffect(() => {
    if (!enabled || queued === 0) return
    const id = window.setInterval(() => {
      if (queue.current.length === 0) return
      const now = performance.now()
      if (blockedRef.current || domBusy()) return
      if (now - lastTouch.current < QUIET_MS) return
      if (now - lastDrop.current < GAP_MS) return
      const next = queue.current.shift()!
      setQueued(queue.current.length)
      if (injectRef.current(next)) lastDrop.current = now
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [enabled, queued])

  const throwPost = useCallback(async (postId: string, to: "all" | string): Promise<ThrowResult> => {
    try {
      const r = await fxApi<{ sent: number }>("/throw", { method: "POST", body: { post_id: postId, to } })
      return { sent: r.sent }
    } catch (e) {
      return { error: e instanceof Error ? e.message : "erro" }
    }
  }, [])

  const markSeen = useCallback((id_drop: string) => {
    void fxApi("/seen", { method: "POST", body: { ids: [id_drop] } }).catch(() => {})
  }, [])

  return { targets, throwPost, markSeen, queued }
}
