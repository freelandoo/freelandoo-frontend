"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Bell } from "lucide-react"
import { getToken } from "@/lib/auth"
import { NotificationList, type NotificationItem } from "@/components/notifications/notification-list"
import { PageShell, EmptyState, LoadingState } from "@/components/tabloide"

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const fetchPage = useCallback(async (nextCursor: string | null, replace: boolean) => {
    const token = getToken()
    if (!token) {
      setItems([])
      setHasMore(false)
      return
    }
    const sp = new URLSearchParams()
    sp.set("limit", "30")
    if (nextCursor) sp.set("cursor", nextCursor)
    const res = await fetch(`/api/me/notifications?${sp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const next: NotificationItem[] = Array.isArray(data?.items) ? data.items : []
    setItems((prev) => replace ? next : [...prev, ...next])
    setCursor(data?.next_cursor ?? null)
    setHasMore(!!data?.has_more)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPage(null, true)
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [fetchPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore || loadingMore || loading) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && cursor) {
        setLoadingMore(true)
        fetchPage(cursor, false).catch(() => {}).finally(() => setLoadingMore(false))
      }
    }, { rootMargin: "200px 0px" })
    io.observe(el)
    return () => io.disconnect()
  }, [cursor, hasMore, loadingMore, loading, fetchPage])

  const markAll = async () => {
    const token = getToken()
    if (!token) return
    try {
      await fetch("/api/me/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems((prev) => prev.map((it) => it.read_at ? it : { ...it, read_at: new Date().toISOString() }))
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
    } catch { /* silent */ }
  }

  const unread = items.filter((i) => !i.read_at).length

  return (
    <PageShell className="md:pl-[80px]">
      <header className="sticky top-0 z-20 border-b border-[#F5F1E8]/8 bg-[#141009]/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            href="/account"
            className="rounded-full p-1.5 text-[#C9C2B6] transition hover:bg-[#F5F1E8]/10 hover:text-[#F5F1E8]"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="fl-display text-2xl text-[#F5F1E8]">Notificações</h1>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAll}
              className="ml-auto text-xs font-bold text-[#F2B705] transition hover:text-[#ffc81f]"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        {loading ? (
          <div className="px-4 py-16">
            <LoadingState label="Carregando notificações…" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-16">
            <EmptyState
              icon={<Bell className="h-6 w-6" />}
              title="Tudo em dia"
              description="Quando alguém curtir, comentar, seguir ou te mandar mensagem, aparece aqui."
            />
          </div>
        ) : (
          <>
            <NotificationList items={items} onMarkRead={markOne} />
            {loadingMore && (
              <div className="flex items-center justify-center py-6 text-[#9A938A]">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!hasMore && items.length > 0 && (
              <p className="py-8 text-center text-xs text-[#9A938A]">Você chegou ao fim.</p>
            )}
            <div ref={sentinelRef} className="h-px w-full" />
          </>
        )}
      </div>
    </PageShell>
  )
}
