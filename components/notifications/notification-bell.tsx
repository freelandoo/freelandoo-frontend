"use client"

import { useRef, useState } from "react"
import { Bell } from "lucide-react"
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown"
import { useNavCounts } from "@/components/navigation/use-nav-counts"
import { cn } from "@/lib/utils"

/**
 * Sininho de notificações autossuficiente (botão + badge de não-lidas +
 * dropdown). Usa o mesmo NotificationsDropdown do feed/busca e o contador
 * global (useNavCounts). Montado pontualmente onde se quer o sino — hoje só
 * na /account (subperfis não recebem).
 */
export function NotificationBell({ className }: { className?: string }) {
  const navCounts = useNavCounts()
  const unread = navCounts.notificationUnread
  const active = unread > 0
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement | null>(null)

  return (
    <>
      <button
        type="button"
        ref={ref}
        onClick={() => setOpen((v) => !v)}
        aria-label={active ? `Notificações (${unread})` : "Notificações"}
        aria-expanded={open}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0B0B0D] bg-[#F1EDE2] text-[#0B0B0D] shadow-[2px_2px_0_0_#0B0B0D] transition hover:bg-[#F2B705] active:translate-x-px active:translate-y-px",
          className,
        )}
      >
        <Bell className="h-4 w-4" strokeWidth={2} />
        {active && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E0A500] px-1 text-[9px] font-bold text-[#0B0B0D] ring-2 ring-[#1d1810]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <NotificationsDropdown
        open={open}
        anchorRef={ref}
        onClose={() => setOpen(false)}
        onUnreadCountChange={() => window.dispatchEvent(new Event("notifications:unread-changed"))}
      />
    </>
  )
}
