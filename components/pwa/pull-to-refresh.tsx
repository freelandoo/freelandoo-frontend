"use client"

// Pull-to-refresh nativo (mobile): puxar pra baixo no topo recarrega a página,
// como em apps. Funciona tanto no scroll da janela quanto em containers internos
// (feed/bees usam overflow-y-auto próprio) — detecta o scrollable sob o dedo e
// só ativa quando ele está no topo. Cancela em gesto horizontal (preserva swipe
// de stories/bees) e com a câmera ativa. Ícone-only (sem texto = sem i18n).

import { useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"

const THRESHOLD = 72 // px (após resistência) para disparar o refresh
const MAX_PULL = 112 // teto visual do indicador
const DAMP = 0.5 // resistência (quanto o dedo "pesa")

function findScrollable(start: EventTarget | null): Element | Window {
  let node = start instanceof Element ? (start as HTMLElement | null) : null
  while (node && node !== document.body) {
    const oy = getComputedStyle(node).overflowY
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) {
      return node
    }
    node = node.parentElement
  }
  return window
}

function scrollTopOf(c: Element | Window): number {
  return c === window
    ? window.scrollY || document.documentElement.scrollTop || 0
    : (c as Element).scrollTop
}

export function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Estado mutável do gesto fora do React (evita re-render por frame).
  // container começa null (não referenciar window aqui — roda no SSR); é
  // atribuído no onStart, que só executa no cliente.
  const g = useRef<{
    active: boolean
    startY: number
    startX: number
    pull: number
    container: Element | Window | null
  }>({
    active: false,
    startY: 0,
    startX: 0,
    pull: 0,
    container: null,
  })

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (refreshing) return
      if (e.touches.length !== 1) return
      if (document.body.classList.contains("camera-active")) return
      const container = findScrollable(e.target)
      if (scrollTopOf(container) > 0) return // só no topo
      const t = e.touches[0]
      g.current.active = true
      g.current.startY = t.clientY
      g.current.startX = t.clientX
      g.current.container = container
      g.current.pull = 0
    }

    const onMove = (e: TouchEvent) => {
      const s = g.current
      if (!s.active || !s.container) return
      const t = e.touches[0]
      const dy = t.clientY - s.startY
      const dx = t.clientX - s.startX
      // Subindo, ou gesto mais horizontal que vertical, ou container saiu do
      // topo → não é pull-to-refresh: solta o gesto pro scroll/swipe normal.
      if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || scrollTopOf(s.container) > 0) {
        if (s.pull !== 0) {
          s.pull = 0
          setPull(0)
        }
        s.active = false
        return
      }
      const dist = Math.min(MAX_PULL, dy * DAMP)
      s.pull = dist
      if (!dragging) setDragging(true)
      setPull(dist)
      // Impede o overscroll/bounce nativo enquanto puxamos (listener não-passivo).
      if (e.cancelable) e.preventDefault()
    }

    const onEnd = () => {
      const s = g.current
      if (!s.active) return
      s.active = false
      setDragging(false)
      if (s.pull >= THRESHOLD) {
        setRefreshing(true)
        setPull(THRESHOLD)
        // Pequeno atraso pra o spinner pintar antes do reload.
        window.setTimeout(() => window.location.reload(), 320)
      } else {
        s.pull = 0
        setPull(0)
      }
    }

    document.addEventListener("touchstart", onStart, { passive: true })
    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onEnd, { passive: true })
    document.addEventListener("touchcancel", onEnd, { passive: true })
    return () => {
      document.removeEventListener("touchstart", onStart)
      document.removeEventListener("touchmove", onMove)
      document.removeEventListener("touchend", onEnd)
      document.removeEventListener("touchcancel", onEnd)
    }
  }, [dragging, refreshing])

  const progress = Math.min(1, pull / THRESHOLD)
  if (pull <= 0 && !refreshing) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center"
      style={{
        transform: `translateY(${pull - 44}px)`,
        opacity: refreshing ? 1 : progress,
        transition: dragging ? "none" : "transform 0.22s ease-out, opacity 0.22s ease-out",
      }}
    >
      <div
        className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
        style={{ transform: `scale(${0.7 + progress * 0.3})` }}
      >
        <RefreshCw
          className={refreshing ? "h-5 w-5 animate-spin text-[#0B0B0D]" : "h-5 w-5 text-[#0B0B0D]"}
          style={refreshing ? undefined : { transform: `rotate(${progress * 280}deg)` }}
        />
      </div>
    </div>
  )
}
