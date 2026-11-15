"use client"

// "VER JUNTO COM QUEM?" — abre quando o post é jogado para o lado (gesto).
// Escolheu: cria a sessão de feed sincronizado (o convite chega na pessoa) e
// guarda a lista do MEU feed a partir do post jogado — a sessão começa dali
// (sessionStorage `fx:sync:list:<id>`, lido pelo SyncFeed do anfitrião).

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { Link2, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { fx } from "@/lib/feed-fx"
import { fxApi } from "@/lib/feed-fx/api"
import { useTranslations } from "@/components/i18n/I18nProvider"
import type { ThrowTarget } from "./gesture-post"

export const SYNC_LIST_KEY = (id: string) => `fx:sync:list:${id}`

export function SyncPicker({
  open,
  targets,
  postIds,
  onClose,
}: {
  open: boolean
  targets: ThrowTarget[]
  /** Os posts do meu feed a partir do que foi jogado (a sessão começa por eles). */
  postIds: string[]
  onClose: () => void
}) {
  const t = useTranslations("FeedFx")
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const pick = async (u: ThrowTarget) => {
    setBusy(u.id_user)
    try {
      const r = await fxApi<{ session: { id_session: string } }>("/sync", { method: "POST", body: { id_user: u.id_user } })
      try {
        sessionStorage.setItem(SYNC_LIST_KEY(r.session.id_session), JSON.stringify(postIds.slice(0, 30)))
      } catch {
        /* sem armazenamento: a sessão usa o feed do zero */
      }
      fx("sync-convite", "sync")
      router.push(`/feed/junto/${r.session.id_session}`)
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
      setBusy(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[85] flex items-end justify-center bg-black/60 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="fl-sharp w-full max-w-[470px] border-[3px] border-black bg-[#1D1810] p-4 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[8px_8px_0_#000]"
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-[#F2B705]" />
              <span className="flex-1 text-sm font-black uppercase tracking-wider text-[#F2B705]">{t("syncPickTitle", "Ver junto com quem?")}</span>
              <button onClick={onClose} aria-label={t("pathClose", "Fechar")} className="p-1 text-[#9A938A]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-xs text-[#9A938A]">{t("syncPickHint", "A pessoa recebe o convite. Se aceitar, vocês veem o seu feed juntos a partir deste post.")}</p>
            {targets.length === 0 ? (
              <p className="text-sm font-bold text-[#F5F1E8]">{t("syncNobody", "Só dá para sincronizar com quem já troca lançamentos com você.")}</p>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {targets.slice(0, 16).map((u, i) => (
                  <motion.button
                    key={u.id_user}
                    disabled={!!busy}
                    onClick={() => pick(u)}
                    initial={{ y: 16, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 520, damping: 24, delay: i * 0.03 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="relative block h-14 w-14 overflow-hidden rounded-full border-[3px] border-[#F2B705] bg-zinc-800">
                      {u.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                      {busy === u.id_user && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Loader2 className="h-5 w-5 animate-spin text-[#F2B705]" />
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center text-[10px] font-bold text-[#F5F1E8]">@{u.username || "—"}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
