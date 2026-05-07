"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { getToken } from "@/lib/auth"

const POLL_MS = 30_000

interface UnreadResponse {
  total?: number
}

export default function MessagesNavLink({ className = "" }: { className?: string }) {
  const [unread, setUnread] = useState(0)
  const [authed, setAuthed] = useState<boolean>(false)

  useEffect(() => {
    const sync = () => setAuthed(!!getToken())
    sync()
    window.addEventListener("auth:changed", sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener("auth:changed", sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  useEffect(() => {
    if (!authed) {
      // reset defensivo quando o usuário desloga sem unmount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnread(0)
      return
    }
    let cancelled = false

    const fetchUnread = async () => {
      const token = getToken()
      if (!token) return
      try {
        const res = await fetch("/api/conversations/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (!res.ok) return
        const data = (await res.json()) as UnreadResponse
        if (!cancelled) setUnread(Number(data?.total) || 0)
      } catch {
        // silencioso
      }
    }

    fetchUnread()
    const t = setInterval(fetchUnread, POLL_MS)
    const onChanged = () => fetchUnread()
    window.addEventListener("mensagens:unread-changed", onChanged)

    return () => {
      cancelled = true
      clearInterval(t)
      window.removeEventListener("mensagens:unread-changed", onChanged)
    }
  }, [authed])

  if (!authed) return null

  return (
    <Link
      href="/mensagens"
      aria-label="Mensagens"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white ${className}`}
    >
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground ring-2 ring-black">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  )
}
