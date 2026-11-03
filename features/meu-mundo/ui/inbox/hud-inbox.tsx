"use client"

// features/meu-mundo/ui/inbox/hud-inbox.tsx — chat, envelope e sino no canto
// de cima à direita (mm3d-30; chat = mm3d-32), com o contador de não lidas.
// Botões de 44 × 44, grafite; o número em rubi. Envelope e sino abrem o mesmo
// painel (inbox-panel); o balão abre o chat (Global + conversas).

import { Bell, Mail, MessageCircle } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { InboxCounts } from "../../types"

export default function HudInbox({
  counts,
  onBell,
  onMail,
  chat,
  onChat,
}: {
  counts: InboxCounts | null
  onBell: () => void
  onMail: () => void
  /** não lidas do chat (Global + conversas) */
  chat: number
  onChat: () => void
}) {
  const t = useTranslations("MeuMundo")
  const n = counts?.notices ?? 0
  const m = counts?.mail ?? 0
  const label = (base: string, count: number) => (count ? `${base} (${t("ibUnreadCount", "{n} não lidas").replace("{n}", String(count))})` : base)
  return (
    <div
      className="pointer-events-none fixed right-0 z-[71] flex gap-2"
      style={{ top: "max(12px, env(safe-area-inset-top))", paddingRight: "max(12px, env(safe-area-inset-right))" }}
    >
      <HudButton onClick={onChat} count={chat} label={label(t("chTitle", "Chat"), chat)} icon={<MessageCircle className="h-5 w-5" />} />
      <HudButton onClick={onMail} count={m} label={label(t("ibMailTitle", "Caixa de entrada"), m)} icon={<Mail className="h-5 w-5" />} />
      <HudButton onClick={onBell} count={n} label={label(t("ibNoticesTitle", "Notificações"), n)} icon={<Bell className="h-5 w-5" />} />
    </div>
  )
}

function HudButton({ onClick, count, label, icon }: { onClick: () => void; count: number; label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="pointer-events-auto relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[#FFD68A] shadow-[inset_0_0_0_2px_#E8B65B,inset_0_0_0_4px_#10161D,inset_0_0_0_5px_rgba(255, 122, 26,0.45),0_0_0_1px_#000,2px_3px_0_rgba(0,0,0,0.6)] transition-[color,box-shadow,transform] duration-200 hover:text-[#FFB347] hover:shadow-[inset_0_0_0_2px_#FFB347,inset_0_0_0_4px_#10161D,inset_0_0_10px_rgba(255, 122, 26,0.45),0_0_0_1px_#000,0_0_14px_rgba(255, 122, 26,0.6)] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF8A1F]"
      style={{
        // mm3d-60c: anel de prata escovada, grafite por dentro, filete azul
        background: "radial-gradient(circle at 50% 30%, #2C3742 0%, #131A22 62%, #0A0E13 100%)",
      }}
    >
      {icon}
      {count > 0 && (
        <span
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none tabular-nums"
          style={{ background: "linear-gradient(180deg, #FFB347, #C2410C)", color: "#fff", boxShadow: "0 0 0 2px #0B1016, 0 0 10px rgba(255, 122, 26,0.75)" }}
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  )
}
