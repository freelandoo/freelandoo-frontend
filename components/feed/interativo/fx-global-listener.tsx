"use client"

// Avisos do Feed Interativo em QUALQUER tela: convite para lançar no meu feed
// e "aceitou seu convite" (socket `fi:links`). Os convites de feed junto (F6)
// também passam por aqui. Sem login, não escuta nada.

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { onRealtime } from "@/lib/realtime"
import { getToken } from "@/lib/auth"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { useTranslations } from "@/components/i18n/I18nProvider"

type Who = { username?: string | null } | undefined

export function FxGlobalListener() {
  const t = useTranslations("FeedFx")
  const router = useRouter()

  useEffect(() => {
    if (!getToken()) return
    installFeedFx()
    const offNotice = onRealtime("fi:notice", (raw) => {
      const p = (raw || {}) as { type?: string; by?: Who }
      if (p.type === "gift-opened") {
        fx("bau-premio", "premio", { gain: 0.7 })
        toast.success(t("toastGiftOpened", "@{u} abriu o seu baú!").replace("{u}", p.by?.username || "—"))
      }
    })
    const offLinks = onRealtime("fi:links", (raw) => {
      const p = (raw || {}) as { type?: string; from?: Who; by?: Who }
      if (p.type === "invite") {
        fx("convite", "sync")
        toast(t("toastInvite", "@{u} quer lançar posts no seu feed").replace("{u}", p.from?.username || "—"), {
          action: { label: t("toastSee", "Ver"), onClick: () => router.push("/feed/lancar") },
        })
      } else if (p.type === "accepted") {
        fx("convite", "sync")
        toast.success(t("toastAccepted", "@{u} aceitou: agora você lança no feed dele(a)").replace("{u}", p.by?.username || "—"))
      }
    })
    return () => {
      offNotice()
      offLinks()
    }
  }, [router, t])

  return null
}
