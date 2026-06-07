"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
import { onRealtime } from "@/lib/realtime"
import { NotificationList, type NotificationItem } from "./notification-list"

interface NotificationsDropdownProps {
  open: boolean
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

export function NotificationsDropdown({ open, anchorRef, onClose, onUnreadCountChange }: NotificationsDropdownProps) {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unread, setUnread] = useState(0)
  const [mounted, setMounted] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Portal só no cliente (evita mismatch de SSR).
  useEffect(() => setMounted(true), [])

  // Mantém o callback num ref — pais costumam passar arrow inline (referência
  // nova a cada render). Sem isso, depender de onUnreadCountChange no fetch
  // useEffect causa loop: fetch → setState → parent re-render → callback ref
  // novo → effect re-roda → fetch → repeat.
  const onUnreadCountChangeRef = useRef(onUnreadCountChange)
  useEffect(() => {
    onUnreadCountChangeRef.current = onUnreadCountChange
  }, [onUnreadCountChange])

  useEffect(() => {
    if (!open) return
    const token = getToken()
    if (!token) return
    let cancelled = false
    setLoading(true)
    fetch("/api/me/notifications?limit=15", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
      .then((r) => r.ok ? r.json() : { items: [], unread_count: 0 })
      .then((data) => {
        if (cancelled) return
        setItems(Array.isArray(data?.items) ? data.items : [])
        const n = typeof data?.unread_count === "number" ? data.unread_count : 0
        setUnread(n)
        onUnreadCountChangeRef.current?.(n)
      })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (anchorRef.current?.contains(t)) return
      onClose()
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open, onClose, anchorRef])

  // Realtime: notificação nova → re-puxa o feed enquanto o dropdown está aberto.
  // Quando fechado, o sininho atualiza o contador via nav-counts:changed.
  useEffect(() => {
    if (!open) return
    const off = onRealtime("notification:new", () => {
      const token = getToken()
      if (!token) return
      fetch("/api/me/notifications?limit=15", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (!data) return
          setItems(Array.isArray(data.items) ? data.items : [])
          const n = typeof data.unread_count === "number" ? data.unread_count : 0
          setUnread(n)
          onUnreadCountChangeRef.current?.(n)
        })
        .catch(() => { /* silent */ })
    })
    return () => { off() }
  }, [open])

  const markAll = async () => {
    const token = getToken()
    if (!token) return
    try {
      await fetch("/api/me/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems((prev) => prev.map((it) => it.read_at ? it : { ...it, read_at: new Date().toISOString() }))
      setUnread(0)
      onUnreadCountChangeRef.current?.(0)
    } catch { /* silent */ }
  }

  const markOne = async (id: string) => {
    const token = getToken()
    if (!token) return
    try {
      await fetch(`/api/me/notifications/${encodeURIComponent(id)}/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems((prev) => prev.map((it) => it.id_notification === id ? { ...it, read_at: new Date().toISOString() } : it))
      setUnread((n) => Math.max(0, n - 1))
      onUnreadCountChangeRef.current?.(Math.max(0, unread - 1))
    } catch { /* silent */ }
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      ref={panelRef}
      className="fixed right-4 top-[64px] z-[120] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#F5F1E8]/10 bg-[#15120E]/95 shadow-2xl backdrop-blur-xl"
      role="dialog"
      aria-label="Notificações"
    >
      <div className="flex items-center justify-between border-b border-[#F5F1E8]/[0.08] px-4 py-2.5">
        <h3 className="text-sm font-bold text-[#F5F1E8]">Notificações</h3>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="text-[11px] font-semibold text-[#F2B705] transition hover:text-[#ffc81f]"
          >
            Marcar todas
          </button>
        )}
      </div>
      <div className="max-h-[60dvh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-[#9A938A]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <NotificationList items={items} onMarkRead={markOne} />
        )}
      </div>
      <div className="border-t border-[#F5F1E8]/[0.08] bg-black/30 px-4 py-2 text-center">
        <Link
          href="/notificacoes"
          onClick={onClose}
          className="text-[11px] font-semibold text-[#C9C2B6] transition hover:text-[#F5F1E8]"
        >
          Ver todas
        </Link>
      </div>
    </div>,
    document.body
  )
}
