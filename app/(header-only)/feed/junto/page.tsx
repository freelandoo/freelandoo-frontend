"use client"

// /feed/junto — chamar alguém para ver o feed junto (F6, mig 459).
// Só aparece quem já troca lançamentos com você (em algum sentido).

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Link2, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { PageShell, PageBackLink, Section } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { fxApi, type FxLink, type FxUser } from "@/lib/feed-fx/api"

export default function FeedJuntoPage() {
  const t = useTranslations("FeedFx")
  const router = useRouter()
  const [links, setLinks] = useState<{ sending: FxLink[]; receiving: FxLink[] } | null>(null)
  const [logged, setLogged] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    installFeedFx()
    if (!getToken()) {
      setLogged(false)
      return
    }
    fxApi<{ sending: FxLink[]; receiving: FxLink[] }>("/links")
      .then(setLinks)
      .catch(() => setLinks({ sending: [], receiving: [] }))
  }, [])

  const people = useMemo(() => {
    const m = new Map<string, FxUser>()
    for (const l of [...(links?.sending || []), ...(links?.receiving || [])]) {
      if (l.status === "active" || l.status === "silenced") m.set(l.user.id_user, l.user)
    }
    return [...m.values()]
  }, [links])

  const invite = async (u: FxUser) => {
    setBusy(u.id_user)
    try {
      const r = await fxApi<{ session: { id_session: string } }>("/sync", { method: "POST", body: { id_user: u.id_user } })
      fx("sync-convite", "sync")
      router.push(`/feed/junto/${r.session.id_session}`)
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
      setBusy(null)
    }
  }

  return (
    <PageShell>
      <Section className="pb-20 pt-10 sm:pt-14">
        <div className="max-w-2xl">
          <PageBackLink href="/feed" className="mb-5" />
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Link2 className="h-3.5 w-3.5" />
            {t("panelEyebrow", "Feed interativo")}
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl">{t("syncTitle", "Ver o feed junto")}</h1>
          <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
            {t("syncLead", "Os dois veem o mesmo feed ao mesmo tempo: quando você passa de post, a outra pessoa passa também; vídeo toca e pausa junto.")}
          </p>
          {!logged ? (
            <p className="mt-10 font-bold text-[#F2B705]">{t("needLogin", "Entre na sua conta para usar.")}</p>
          ) : !links ? (
            <Loader2 className="mt-10 h-6 w-6 animate-spin text-[#9A938A]" />
          ) : people.length === 0 ? (
            <div className="mt-10 border-2 border-[#F2B705] bg-black/30 p-5">
              <p className="font-bold text-[#F5F1E8]">{t("syncNobody", "Só dá para sincronizar com quem já troca lançamentos com você.")}</p>
              <Link
                href="/feed/lancar"
                className="mt-4 inline-flex h-10 items-center gap-1.5 border-2 border-black bg-[#F2B705] px-3 text-xs font-black uppercase tracking-wider text-black shadow-[3px_3px_0_#000]"
              >
                <Send className="h-4 w-4" />
                {t("inviteCta", "Convidar")}
              </Link>
            </div>
          ) : (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {people.map((u, i) => (
                <motion.li key={u.id_user} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    disabled={!!busy}
                    onClick={() => invite(u)}
                    className="flex w-full flex-col items-center gap-2 border-[3px] border-black bg-[#1D1810] p-4 shadow-[5px_5px_0_#000] transition hover:bg-[#2a2216] disabled:opacity-60"
                  >
                    <span className="block h-16 w-16 overflow-hidden rounded-full border-[3px] border-[#F2B705] bg-zinc-800">
                      {u.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </span>
                    <span className="w-full truncate text-center text-sm font-black text-[#F5F1E8]">@{u.username}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-[#F2B705]">
                      {busy === u.id_user ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                      {t("syncCall", "Chamar")}
                    </span>
                  </motion.button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </PageShell>
  )
}
