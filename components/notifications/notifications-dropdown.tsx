"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { getToken } from "@/lib/auth"
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
  const panelRef = useRef<HTMLDivElement | null>(null)

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
        onUnreadCountChange?.(n)
      })
      .catch(() => { if (!cancelled) setItems([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, onUnreadCountChange])

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
      onUnreadCountChange?.(0)
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
      onUnreadCountChange?.(Math.max(0, unread - 1))
    } catch { /* silent */ }
  }

  if (!open) return null

  return (
    <div
      ref={panelRef}
      className="fixed right-4 top-[60px] z-[60] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
      role="dialog"
      aria-label="Notificações"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <h3 className="text-sm font-semibold text-white">Notificações</h3>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="text-[11px] font-medium text-amber-300 transition hover:text-amber-200"
          >
            Marcar todas
          </button>
        )}
      </div>
      <div className="max-h-[60dvh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <NotificationList items={items} onMarkRead={markOne} />
        )}
      </div>
      <div className="border-t border-white/[0.06] bg-black/40 px-4 py-2 text-center">
        <Link
          href="/notificacoes"
          onClick={onClose}
          className="text-[11px] font-semibold text-white/75 transition hover:text-white"
        >
          Ver todas
        </Link>
      </div>
    </div>
  )
}
