"use client"

// /feed/capsula — CÁPSULA DO TEMPO (Feed Interativo F4).
// Para mim (carta para o futuro) ou para quem aceitou meus lançamentos: data
// e hora, mensagem, um post meu (opcional) e onde entregar (feed, mensagens
// ou os dois). A lista mostra o estado e deixa cancelar antes da hora.

import { useCallback, useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Hourglass, Loader2, Lock, X } from "lucide-react"
import { toast } from "sonner"
import { PageShell, PageBackLink, Section } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { fxApi, type FxUser } from "@/lib/feed-fx/api"

type Destino = "feed" | "mensagens" | "ambos"
interface Capsule {
  id_drop: string
  status: "scheduled" | "delivered" | "seen" | "canceled" | "failed" | "muted"
  deliver_at: string
  message: string | null
  destino: Destino
  has_post: boolean
  to: FxUser | null
}
interface MyPost {
  id_portfolio_item: string
  title: string | null
  feed_kind?: string
  media: { media_url: string; media_type: "image" | "video"; thumbnail_url?: string | null }[]
}

/** "agora + 1 dia" no formato do datetime-local (hora local). */
function defaultWhen() {
  const d = new Date(Date.now() + 86400_000)
  d.setSeconds(0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function FeedCapsulaPage() {
  const t = useTranslations("FeedFx")
  const locale = useLocale()
  const [logged, setLogged] = useState(true)
  const [loading, setLoading] = useState(true)
  const [targets, setTargets] = useState<FxUser[]>([])
  const [list, setList] = useState<Capsule[]>([])
  const [posts, setPosts] = useState<MyPost[]>([])
  const [to, setTo] = useState<string>("eu")
  const [when, setWhen] = useState("")
  const [message, setMessage] = useState("")
  const [postId, setPostId] = useState<string | null>(null)
  const [destino, setDestino] = useState<Destino>("feed")
  const [saving, setSaving] = useState(false)
  const [sealed, setSealed] = useState(0)

  const load = useCallback(async () => {
    try {
      const [tg, cl] = await Promise.all([
        fxApi<{ targets: FxUser[] }>("/targets"),
        fxApi<{ capsules: Capsule[] }>("/capsules"),
      ])
      setTargets(tg.targets || [])
      setList(cl.capsules || [])
    } catch {
      /* vazio */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    installFeedFx()
    setWhen(defaultWhen())
    const token = getToken()
    if (!token) {
      setLogged(false)
      setLoading(false)
      return
    }
    void load()
    fetch("/api/me/portfolio", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const items: MyPost[] = Array.isArray(d) ? d : d?.items || []
        setPosts(items.filter((p) => p.media?.length && p.feed_kind !== "bees").slice(0, 24))
      })
      .catch(() => {})
  }, [load])

  const schedule = async () => {
    if (saving) return
    setSaving(true)
    try {
      const deliver_at = new Date(when).toISOString()
      await fxApi("/capsules", {
        method: "POST",
        body: { to, deliver_at, message: message.trim() || null, post_id: postId, destino: to === "eu" ? "feed" : destino },
      })
      fx("capsula-agendar", "capsula")
      setSealed((n) => n + 1)
      toast.success(t("capsuleSaved", "Cápsula lacrada. Ela abre na hora marcada."))
      setMessage("")
      setPostId(null)
      await load()
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (id: string) => {
    try {
      await fxApi(`/capsules/${id}/cancel`, { method: "POST" })
      fx("cancelar", "cancelar")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    }
  }

  const fmt = useMemo(
    () => (iso: string) => {
      try {
        return new Date(iso).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })
      } catch {
        return iso
      }
    },
    [locale]
  )
  const statusLabel: Record<Capsule["status"], string> = {
    scheduled: t("capStatusScheduled", "lacrada"),
    delivered: t("capStatusDelivered", "entregue"),
    seen: t("capStatusDelivered", "entregue"),
    muted: t("capStatusDelivered", "entregue"),
    canceled: t("capStatusCanceled", "cancelada"),
    failed: t("capStatusFailed", "não entregue"),
  }
  const chip = (active: boolean) =>
    "inline-flex h-10 items-center gap-1.5 border-2 border-black px-3 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] transition active:translate-x-px active:translate-y-px " +
    (active ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]")

  return (
    <PageShell>
      <Section className="pb-20 pt-10 sm:pt-14">
        <div className="max-w-2xl">
          <PageBackLink href="/feed" className="mb-5" />
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Hourglass className="h-3.5 w-3.5" />
            {t("panelEyebrow", "Feed interativo")}
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl">{t("capsuleTitle", "Cápsula do tempo")}</h1>
          <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
            {t("capsuleLead", "Escreva agora, entregue depois: para você mesmo no futuro ou para quem aceitou seus lançamentos.")}
          </p>

          {!logged ? (
            <p className="mt-10 font-bold text-[#F2B705]">{t("needLogin", "Entre na sua conta para usar.")}</p>
          ) : loading ? (
            <Loader2 className="mt-10 h-6 w-6 animate-spin text-[#9A938A]" />
          ) : (
            <>
              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestTo", "Para quem")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setTo("eu")} className={chip(to === "eu")}>
                  {t("capsuleToMe", "Para mim")}
                </button>
                {targets.map((u) => (
                  <button key={u.id_user} onClick={() => setTo(u.id_user)} className={chip(to === u.id_user)}>
                    @{u.username}
                  </button>
                ))}
              </div>

              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("capsuleWhen", "Quando abrir")}</h2>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-3 h-12 w-full border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 font-bold text-[#F5F1E8] outline-none [color-scheme:dark] focus:border-[#F2B705]"
              />

              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestMessage", "Mensagem")}</h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                rows={5}
                placeholder={t("capsuleMessagePh", "Querido eu do futuro…")}
                className="mt-3 w-full border-2 border-[#F5F1E8]/15 bg-[#1D1810] p-3 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
              />
              <div className="text-right text-xs text-[#9A938A]">{message.length}/500</div>

              {posts.length > 0 && (
                <>
                  <h2 className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("capsulePost", "Junto, um post seu (opcional)")}</h2>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                    {posts.map((p) => {
                      const m = p.media[0]
                      const src = m.media_type === "video" ? m.thumbnail_url : m.media_url
                      const on = postId === p.id_portfolio_item
                      return (
                        <button
                          key={p.id_portfolio_item}
                          onClick={() => setPostId(on ? null : p.id_portfolio_item)}
                          className={"relative h-20 w-16 shrink-0 overflow-hidden border-[3px] " + (on ? "border-[#F2B705]" : "border-black opacity-70")}
                        >
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="block h-full w-full bg-zinc-800" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {to !== "eu" && (
                <>
                  <h2 className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("capsuleWhere", "Onde entregar")}</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(
                      [
                        ["feed", t("capsuleWhereFeed", "No feed")],
                        ["mensagens", t("capsuleWhereChat", "Nas mensagens")],
                        ["ambos", t("capsuleWhereBoth", "Nos dois")],
                      ] as [Destino, string][]
                    ).map(([d, label]) => (
                      <button key={d} onClick={() => setDestino(d)} className={chip(destino === d)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={schedule}
                  disabled={saving || (!message.trim() && !postId) || !when}
                  className="mt-8 inline-flex h-14 w-full items-center justify-center gap-2 border-[3px] border-black bg-[#F2B705] text-base font-black uppercase tracking-wider text-black shadow-[6px_6px_0_#000] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                  {t("capsuleSeal", "Lacrar a cápsula")}
                </motion.button>
                <AnimatePresence>
                  {sealed > 0 && (
                    <motion.span
                      key={sealed}
                      className="pointer-events-none absolute left-1/2 top-1/2 -ml-16 w-32 border-[3px] border-[#F2B705] bg-black px-2 py-1 text-center text-sm font-black uppercase tracking-widest text-[#F2B705] shadow-[4px_4px_0_#000]"
                      initial={{ scale: 2.4, rotate: -16, opacity: 0 }}
                      animate={{ scale: 1, rotate: -6, opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1.6, times: [0, 0.15, 0.75, 1] }}
                    >
                      {t("capsuleSealedStamp", "LACRADA")}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <h2 className="mt-14 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("capsuleList", "Suas cápsulas")}</h2>
              {list.length === 0 ? (
                <p className="mt-2 text-sm text-[#9A938A]">{t("capsuleEmpty", "Nenhuma ainda.")}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {list.map((c) => (
                      <motion.li
                        key={c.id_drop}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 border-2 border-[#F5F1E8]/12 bg-[#1D1810] p-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
                      >
                        <Hourglass className={"h-5 w-5 shrink-0 " + (c.status === "scheduled" ? "text-[#F2B705]" : "text-[#9A938A]")} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-black text-[#F5F1E8]">
                            {c.to ? `@${c.to.username}` : t("capsuleToMe", "Para mim")} · {fmt(c.deliver_at)}
                          </div>
                          <div className="truncate text-xs text-[#9A938A]">
                            {statusLabel[c.status]}
                            {c.message ? ` · ${c.message}` : ""}
                          </div>
                        </div>
                        {c.status === "scheduled" && (
                          <button
                            onClick={() => cancel(c.id_drop)}
                            className="inline-flex h-9 items-center gap-1 border-2 border-black bg-[#15120E] px-2 text-xs font-black uppercase text-[#F5F1E8] shadow-[3px_3px_0_#000]"
                          >
                            <X className="h-4 w-4" />
                            {t("capsuleCancel", "Cancelar")}
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </>
          )}
        </div>
      </Section>
    </PageShell>
  )
}
