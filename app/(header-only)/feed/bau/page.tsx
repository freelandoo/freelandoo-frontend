"use client"

// /feed/bau — MANDAR UM BAÚ (Feed Interativo F3, mig 457).
// Escolhe quem recebe (ou "na sorte"), o baú, a figurinha, a reação surpresa e
// uma mensagem curta. O baú da prévia reage a cada escolha; ao enviar ele
// sacode, a tampa fecha e ele voa para cima. Embaixo, a sua coleção.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Dices, Gift, Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { PageShell, PageBackLink, Section } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { fx, installFeedFx } from "@/lib/feed-fx"
import { fxApi, type FxUser } from "@/lib/feed-fx/api"
import { CHESTS, REACTIONS, STICKERS, STICKER_BY_ID, type Chest, type Reaction } from "@/lib/feed-fx/gifts"
import { ChestArt, ReactionOverlay, StickerBadge } from "@/components/feed/interativo/fx-art"
import { DonationForm } from "@/components/feed/interativo/donation-form"

interface Owned {
  sticker_id: string
  qty: number
}

export default function FeedBauPage() {
  const t = useTranslations("FeedFx")
  const [targets, setTargets] = useState<FxUser[]>([])
  const [loading, setLoading] = useState(true)
  const [logged, setLogged] = useState(true)
  const [to, setTo] = useState<string>("sorte")
  const [chest, setChest] = useState<Chest>("madeira")
  const [sticker, setSticker] = useState<string | null>("estrela")
  const [reaction, setReaction] = useState<Reaction | null>("confete")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [flying, setFlying] = useState(false)
  const [preview, setPreview] = useState(0)
  const [owned, setOwned] = useState<Owned[]>([])
  // Baú de DOAÇÃO (mig 460) é o padrão; o baú para amigo é a outra aba.
  const [mode, setMode] = useState<"doacao" | "amigo">("doacao")

  const load = useCallback(async () => {
    try {
      const [tg, st] = await Promise.all([
        fxApi<{ targets: FxUser[] }>("/targets"),
        fxApi<{ stickers: Owned[] }>("/stickers"),
      ])
      setTargets(tg.targets || [])
      setOwned(st.stickers || [])
    } catch {
      /* fica vazio */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    installFeedFx()
    if (!getToken()) {
      setLogged(false)
      setLoading(false)
      return
    }
    void load()
  }, [load])

  const send = async () => {
    if (sending) return
    setSending(true)
    try {
      const r = await fxApi<{ sent: number; to: FxUser | null }>("/gift", {
        method: "POST",
        body: { to, chest, sticker, reaction, message: message.trim() || null },
      })
      setFlying(true)
      fx("bau-enviar", "lancar")
      window.setTimeout(() => {
        setFlying(false)
        fx("carimbo")
      }, 900)
      toast.success(
        r.to
          ? t("giftSentLucky", "A sorte escolheu @{u}!").replace("{u}", r.to.username || "—")
          : t("giftSent", "Baú enviado! Vai cair no feed da pessoa.")
      )
      setMessage("")
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setSending(false)
    }
  }

  const pick = (fn: () => void) => {
    fn()
    setPreview((n) => n + 1)
    fx("mirar", "mirar")
  }

  const chip = (active: boolean) =>
    "inline-flex h-10 items-center gap-1.5 border-2 border-black px-3 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] transition active:translate-x-px active:translate-y-px " +
    (active ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]")
  const ownedMap = new Map(owned.map((o) => [o.sticker_id, o.qty]))

  return (
    <PageShell>
      <Section className="pb-20 pt-10 sm:pt-14">
        <div className="max-w-2xl">
          <PageBackLink href="/feed" className="mb-5" />
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Gift className="h-3.5 w-3.5" />
            {t("panelEyebrow", "Feed interativo")}
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl">{t("chestTitle", "Mandar um baú")}</h1>
          <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
            {mode === "doacao"
              ? t("bauLead", "Coloque o valor que quiser no baú e escolha a região: ele cai no feed de uma pessoa sorteada de lá. Ela não paga nada e não sabe que vai ganhar.")
              : t("chestLead", "O baú cai no feed de quem aceitou seus lançamentos. Só a pessoa vê o que tem dentro quando abrir.")}
          </p>

          {logged && (
            <div className="mt-6 flex gap-2">
              <button onClick={() => { setMode("doacao"); fx("mirar", "mirar") }} className={chip(mode === "doacao")}>
                {t("bauTabDonation", "Baú de doação")}
              </button>
              <button onClick={() => { setMode("amigo"); fx("mirar", "mirar") }} className={chip(mode === "amigo")}>
                {t("bauTabFriend", "Baú para amigo")}
              </button>
            </div>
          )}
          {!logged ? (
            <p className="mt-10 font-bold text-[#F2B705]">{t("needLogin", "Entre na sua conta para usar.")}</p>
          ) : mode === "doacao" ? (
            <DonationForm />
          ) : loading ? (
            <Loader2 className="mt-10 h-6 w-6 animate-spin text-[#9A938A]" />
          ) : targets.length === 0 ? (
            <div className="mt-10 border-2 border-[#F2B705] bg-black/30 p-5">
              <p className="font-bold text-[#F5F1E8]">{t("chestNoTargets", "Ninguém aceitou receber seus lançamentos ainda.")}</p>
              <Link href="/feed/lancar" className={`${chip(true)} mt-4`}>
                <Send className="h-4 w-4" />
                {t("inviteCta", "Convidar")}
              </Link>
            </div>
          ) : (
            <>
              {/* prévia */}
              <div className="relative mt-8 flex h-[240px] items-center justify-center overflow-hidden border-2 border-[#F5F1E8]/12 bg-[#15120E]">
                <AnimatePresence>
                  {!flying ? (
                    <motion.div
                      key={`chest-${preview}`}
                      initial={{ scale: 0.92, rotate: -3 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ y: -320, rotate: -14, scale: 0.6, opacity: 0, transition: { duration: 0.45, ease: [0.4, 0, 1, 1] } }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="relative"
                    >
                      <ChestArt chest={chest} open={false} shake />
                      {sticker && (
                        <div className="absolute -right-10 -top-6 rotate-12">
                          <StickerBadge id={sticker} size={44} />
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                {reaction && preview > 0 && <ReactionOverlay key={`r-${preview}`} kind={reaction} seed={`p${preview}`} />}
              </div>

              {/* para quem */}
              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestTo", "Para quem")}</h2>
              <div className="mt-3 flex flex-wrap gap-3">
                <button onClick={() => pick(() => setTo("sorte"))} className={chip(to === "sorte")}>
                  <Dices className="h-4 w-4" />
                  {t("chestLucky", "Na sorte")}
                </button>
                {targets.map((u) => (
                  <button
                    key={u.id_user}
                    onClick={() => pick(() => setTo(u.id_user))}
                    className={`${chip(to === u.id_user)} pl-1`}
                  >
                    <span className="block h-7 w-7 overflow-hidden rounded-full border-2 border-black bg-zinc-800">
                      {u.avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </span>
                    @{u.username}
                  </button>
                ))}
              </div>

              {/* baú */}
              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestKind", "Baú")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {CHESTS.map((c) => (
                  <button key={c.id} onClick={() => pick(() => setChest(c.id))} className={chip(chest === c.id)}>
                    <span className="block h-4 w-4 border-2 border-black" style={{ background: c.body }} />
                    {t(`chest_${c.id}`, c.name)}
                  </button>
                ))}
              </div>

              {/* figurinha */}
              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestSticker", "Figurinha")}</h2>
              <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
                <button onClick={() => pick(() => setSticker(null))} className={`${chip(sticker === null)} h-[72px] justify-center`}>
                  {t("none", "Nenhuma")}
                </button>
                {STICKERS.map((s) => (
                  <motion.button
                    key={s.id}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => pick(() => setSticker(s.id))}
                    className={"flex justify-center p-1 " + (sticker === s.id ? "bg-[#F2B705]/25" : "")}
                    aria-label={t(`sticker_${s.id}`, s.name)}
                  >
                    <StickerBadge id={s.id} size={52} />
                  </motion.button>
                ))}
              </div>

              {/* reação */}
              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestReaction", "Reação surpresa")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => pick(() => setReaction(null))} className={chip(reaction === null)}>
                  {t("none", "Nenhuma")}
                </button>
                {REACTIONS.map((r) => (
                  <button key={r.id} onClick={() => pick(() => setReaction(r.id))} className={chip(reaction === r.id)}>
                    {t(`reaction_${r.id}`, r.name)}
                  </button>
                ))}
              </div>

              {/* mensagem */}
              <h2 className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("chestMessage", "Mensagem")}</h2>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                rows={3}
                placeholder={t("chestMessagePh", "Escreva algo curto (opcional)")}
                className="mt-3 w-full border-2 border-[#F5F1E8]/15 bg-[#1D1810] p-3 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
              />
              <div className="text-right text-xs text-[#9A938A]">{message.length}/140</div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={send}
                disabled={sending || (!sticker && !reaction && !message.trim())}
                className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 border-[3px] border-black bg-[#F2B705] text-base font-black uppercase tracking-wider text-black shadow-[6px_6px_0_#000] disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
                {t("chestSend", "Mandar o baú")}
              </motion.button>
            </>
          )}

          {/* coleção */}
          {logged && !loading && mode === "amigo" && (
            <>
              <h2 className="mt-14 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">
                {t("collection", "Sua coleção")} · {ownedMap.size}/{STICKERS.length}
              </h2>
              <div className="mt-3 grid grid-cols-4 gap-4 sm:grid-cols-6">
                {STICKERS.map((s, i) => {
                  const q = ownedMap.get(s.id) || 0
                  return (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={"relative flex flex-col items-center " + (q ? "" : "opacity-25 grayscale")}
                    >
                      <StickerBadge id={s.id} size={52} label={q ? t(`sticker_${s.id}`, STICKER_BY_ID[s.id].name) : "?"} />
                      {q > 1 && (
                        <span className="absolute -right-1 -top-2 border-2 border-black bg-[#F2B705] px-1 text-[10px] font-black text-black">×{q}</span>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </Section>
    </PageShell>
  )
}
