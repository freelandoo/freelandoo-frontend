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
import { fxApi } from "@/lib/feed-fx/api"
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
      if (p.type === "bau-paid") {
        fx("carimbo", "chegar")
        toast.success(t("toastBauPaid", "Pagamento confirmado: seu baú está no sorteio da região."))
      } else if (p.type === "bau-dropped") {
        fx("bau-cai", "bau")
        toast(t("toastBauDropped", "Seu baú de doação caiu no feed de alguém!"))
      } else if (p.type === "bau-opened") {
        fx("bau-premio", "premio")
        toast.success(t("toastBauOpened", "Abriram o seu baú de doação. Obrigado!"))
      } else if (p.type === "gift-opened") {
        fx("bau-premio", "premio", { gain: 0.7 })
        toast.success(t("toastGiftOpened", "@{u} abriu o seu baú!").replace("{u}", p.by?.username || "—"))
      }
    })
    // Feed sincronizado (F6): convite com Entrar / Recusar, vale 2 min.
    const offSync = onRealtime("fi:sync", (raw) => {
      const p = (raw || {}) as { type?: string; id_session?: string; from?: Who; expires_in?: number }
      if (p.type !== "invite" || !p.id_session) return
      const sid = p.id_session
      fx("sync-convite", "sync")
      toast(t("toastSyncInvite", "@{u} quer ver o feed junto com você").replace("{u}", p.from?.username || "—"), {
        duration: Math.max(10, p.expires_in || 120) * 1000,
        action: {
          label: t("syncAccept", "Entrar junto"),
          onClick: () => {
            fxApi(`/sync/${sid}/accept`, { method: "POST" })
              .then(() => router.push(`/feed/junto/${sid}`))
              .catch((e) => toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo")))
          },
        },
        cancel: {
          label: t("decline", "Recusar"),
          onClick: () => void fxApi(`/sync/${sid}/decline`, { method: "POST" }).catch(() => {}),
        },
      })
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
      offSync()
      offLinks()
    }
  }, [router, t])

  return null
}
