"use client"

// features/meu-mundo/ui/inbox/hud-inbox.tsx — chat, envelope e sino no canto
// de cima à direita (mm3d-30; chat = mm3d-32). Apresentação 12: ícones SEM moldura
// (traço de 24 px, alvo do dedo de 44 × 44, só sombra) e uma BOLINHA de novidade
// no lugar do número — o número fica dentro do painel e no rótulo do leitor de tela.
// Envelope e sino abrem o mesmo painel (inbox-panel); o balão abre o chat.

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
      className="pointer-events-none fixed right-0 z-[71] flex"
      style={{ top: "max(12px, env(safe-area-inset-top))", paddingRight: "max(12px, env(safe-area-inset-right))" }}
    >
      <HudButton onClick={onChat} count={chat} label={label(t("chTitle", "Chat"), chat)} icon={<MessageCircle className="h-6 w-6" strokeWidth={2.2} />} />
      <HudButton onClick={onMail} count={m} label={label(t("ibMailTitle", "Caixa de entrada"), m)} icon={<Mail className="h-6 w-6" strokeWidth={2.2} />} />
      <HudButton onClick={onBell} count={n} label={label(t("ibNoticesTitle", "Notificações"), n)} icon={<Bell className="h-6 w-6" strokeWidth={2.2} />} />
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
      className="pointer-events-auto relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[#FFE2A6] transition-[color,transform] duration-150 hover:text-[#FFB347] active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#FF8A1F]"
      // sem moldura: o ícone lê sobre qualquer cenário só pela sombra (estática, não anima)
      style={{ filter: "drop-shadow(0 1px 0 #000) drop-shadow(0 0 3px rgba(0,0,0,0.9))" }}
    >
      {icon}
      {count > 0 && (
        <span
          className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full"
          style={{ background: "linear-gradient(180deg, #FFB347, #E0411B)", boxShadow: "0 0 0 1.5px #0B1016, 0 0 8px rgba(255, 122, 26,0.8)" }}
          aria-hidden
        />
      )}
    </button>
  )
}
