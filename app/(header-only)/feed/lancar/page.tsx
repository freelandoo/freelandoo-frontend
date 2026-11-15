"use client"

// /feed/lancar — QUEM PODE LANÇAR (Feed Interativo, mig 456).
//
// Dois lados: "Para quem eu lanço" (meus convites e quem aceitou) e "Quem lança
// no meu feed" (convites recebidos, ativos, silenciados, bloqueados), mais a
// privacidade (quem pode me convidar), som e vibração do feed e o teste dos
// sons (para ouvir os efeitos da Máquina de Sons no aparelho).

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Ban, BellOff, Bell, Check, Loader2, Play, Send, UserMinus, Vibrate, Volume2, X } from "lucide-react"
import { toast } from "sonner"
import { PageShell, PageBackLink, Section } from "@/components/tabloide"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { onRealtime } from "@/lib/realtime"
import { getToken } from "@/lib/auth"
import { fxApi, type FxLink, type FxUser } from "@/lib/feed-fx/api"
import { canVibrate, fx, getFxPrefs, installFeedFx, play, setFxPrefs, type FxSound } from "@/lib/feed-fx"

type Policy = "todos" | "mutuos" | "ninguem"
interface LinksResponse {
  sending: FxLink[]
  receiving: FxLink[]
  prefs: { invite_policy: Policy; accept_gifts: boolean }
}

const SOUNDS: FxSound[] = [
  "pegar", "vitrine", "mirar", "lancar", "lancar-um", "chegar", "carimbo", "brilho",
  "salvar-zona", "salvar", "cancelar", "bau-cai", "bau-abre", "bau-premio", "bau-enviar",
  "capsula", "capsula-agendar", "caminho-botoes", "caminho-escolha", "caminho-fim",
  "sync-convite", "sync-conectado", "sync-sair", "convite", "erro",
]

function Avatar({ u, size = 40 }: { u: FxUser; size?: number }) {
  return (
    <span
      className="block shrink-0 overflow-hidden rounded-full border-2 border-black bg-zinc-800"
      style={{ width: size, height: size }}
    >
      {u.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-black text-white/70">
          {(u.display_name || u.username || "?").slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  )
}

export default function FeedLancarPage() {
  const t = useTranslations("FeedFx")
  const [data, setData] = useState<LinksResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [handle, setHandle] = useState("")
  const [prefs, setPrefs] = useState({ sound: true, haptic: true })
  const [logged, setLogged] = useState(true)

  const load = useCallback(async () => {
    try {
      setData(await fxApi<LinksResponse>("/links"))
    } catch {
      /* mantém o que havia */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    installFeedFx()
    setPrefs(getFxPrefs())
    if (!getToken()) {
      setLogged(false)
      setLoading(false)
      return
    }
    void load()
    return onRealtime("fi:links", () => void load())
  }, [load])

  const act = async (id_link: string, action: string) => {
    setBusy(id_link + action)
    try {
      await fxApi(`/links/${id_link}/${action}`, { method: "POST" })
      if (action === "accept") fx("convite", "sync")
      else fx("carimbo", "cancelar")
      await load()
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setBusy(null)
    }
  }

  const invite = async () => {
    const h = handle.trim()
    if (!h) return
    setBusy("invite")
    try {
      const r = await fxApi<{ already?: boolean; link: { status: string } }>("/links", { method: "POST", body: { username: h } })
      fx("lancar-um", "lancar")
      toast.success(
        r.already
          ? r.link.status === "active"
            ? t("alreadyActive", "Essa pessoa já recebe seus lançamentos.")
            : t("alreadyPending", "O convite já está esperando resposta.")
          : t("inviteSent", "Convite enviado! Quando aceitar, você lança no feed dela.")
      )
      setHandle("")
      await load()
    } catch (e) {
      fx("erro", "erro")
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setBusy(null)
    }
  }

  const savePolicy = async (p: Policy) => {
    setBusy("policy")
    try {
      const r = await fxApi<{ invite_policy: Policy; accept_gifts: boolean }>("/prefs", { method: "PUT", body: { invite_policy: p } })
      setData((d) => (d ? { ...d, prefs: r } : d))
      fx("carimbo")
    } catch {
      fx("erro", "erro")
    } finally {
      setBusy(null)
    }
  }

  const toggleFx = (key: "sound" | "haptic") => {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setFxPrefs({ [key]: next[key] })
    if (key === "sound" && next.sound) play("carimbo")
    if (key === "haptic" && next.haptic) fx("carimbo", "chegar")
  }

  const receiving = data?.receiving || []
  const pendingIn = receiving.filter((l) => l.status === "pending")
  const activeIn = receiving.filter((l) => l.status === "active" || l.status === "silenced")
  const closedIn = receiving.filter((l) => l.status === "blocked" || l.status === "revoked")
  const sending = data?.sending || []

  const btn =
    "inline-flex h-9 items-center gap-1.5 border-2 border-black px-3 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#000] transition active:translate-x-px active:translate-y-px disabled:opacity-50"

  const row = (l: FxLink, actions: React.ReactNode, note?: string) => (
    <motion.li
      key={l.id_link}
      layout
      initial={{ opacity: 0, y: 14, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: "spring", stiffness: 480, damping: 30 }}
      className="flex flex-wrap items-center gap-3 border-2 border-[#F5F1E8]/12 bg-[#1D1810] p-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)]"
    >
      <Avatar u={l.user} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-black text-[#F5F1E8]">{l.user.display_name || l.user.username}</div>
        <div className="truncate text-xs text-[#9A938A]">
          @{l.user.username}
          {note ? ` · ${note}` : ""}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </motion.li>
  )

  return (
    <PageShell>
      <Section className="pb-20 pt-10 sm:pt-14">
        <div className="fl-sharp max-w-2xl">
          <PageBackLink href="/feed" className="mb-5" />
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F2B705]">
            <Send className="h-3.5 w-3.5" />
            {t("panelEyebrow", "Feed interativo")}
          </div>
          <h1 className="fl-display text-4xl leading-[0.95] text-[#F5F1E8] sm:text-5xl">{t("panelTitle", "Quem pode lançar")}</h1>
          <p className="mt-4 text-base leading-relaxed text-[#C9C2B6]">
            {t(
              "panelLead",
              "Segure um post no feed e jogue para cima: ele cai no feed de quem aceitou. Segure mais um pouco para escolher uma pessoa só. Puxe para baixo para salvar."
            )}
          </p>

          {!logged ? (
            <p className="mt-10 font-bold text-[#F2B705]">{t("needLogin", "Entre na sua conta para usar.")}</p>
          ) : loading ? (
            <div className="mt-10 text-[#9A938A]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* convidar */}
              <h2 className="mt-10 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("inviteTitle", "Convidar alguém")}</h2>
              <p className="mt-1 text-sm text-[#C9C2B6]">
                {t("inviteTerms", "Ao aceitar, a pessoa permite que você jogue conteúdos direto no feed dela. Ela pode silenciar ou tirar a permissão quando quiser.")}
              </p>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  void invite()
                }}
              >
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@usuario"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="h-11 min-w-0 flex-1 border-2 border-[#F5F1E8]/15 bg-[#1D1810] px-3 font-bold text-[#F5F1E8] outline-none focus:border-[#F2B705]"
                />
                <button type="submit" disabled={busy === "invite" || !handle.trim()} className={`${btn} h-11 bg-[#F2B705] text-black`}>
                  {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t("inviteCta", "Convidar")}
                </button>
              </form>

              {/* convites recebidos */}
              <AnimatePresence>
                {pendingIn.length > 0 && (
                  <motion.section initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10">
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-[#F2B705]">{t("pendingIn", "Querem lançar no seu feed")}</h2>
                    <ul className="mt-3 space-y-2">
                      <AnimatePresence initial={false}>
                        {pendingIn.map((l) =>
                          row(
                            l,
                            <>
                              <button disabled={!!busy} onClick={() => act(l.id_link, "accept")} className={`${btn} bg-[#F2B705] text-black`}>
                                <Check className="h-4 w-4" />
                                {t("accept", "Aceitar")}
                              </button>
                              <button disabled={!!busy} onClick={() => act(l.id_link, "decline")} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
                                <X className="h-4 w-4" />
                                {t("decline", "Recusar")}
                              </button>
                              <button disabled={!!busy} onClick={() => act(l.id_link, "block")} className={`${btn} bg-[#15120E] text-red-300`} aria-label={t("block", "Bloquear")}>
                                <Ban className="h-4 w-4" />
                              </button>
                            </>,
                            t("pendingNote", "convite")
                          )
                        )}
                      </AnimatePresence>
                    </ul>
                  </motion.section>
                )}
              </AnimatePresence>

              {/* quem lança no meu feed */}
              <h2 className="mt-10 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("activeIn", "Lançam no seu feed")}</h2>
              {activeIn.length === 0 ? (
                <p className="mt-2 text-sm text-[#9A938A]">{t("activeInEmpty", "Ninguém ainda.")}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {activeIn.map((l) =>
                      row(
                        l,
                        <>
                          {l.status === "active" ? (
                            <button disabled={!!busy} onClick={() => act(l.id_link, "silence")} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
                              <BellOff className="h-4 w-4" />
                              {t("silence", "Silenciar")}
                            </button>
                          ) : (
                            <button disabled={!!busy} onClick={() => act(l.id_link, "unsilence")} className={`${btn} bg-[#F2B705] text-black`}>
                              <Bell className="h-4 w-4" />
                              {t("unsilence", "Reativar")}
                            </button>
                          )}
                          <button disabled={!!busy} onClick={() => act(l.id_link, "revoke")} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
                            <UserMinus className="h-4 w-4" />
                            {t("revoke", "Tirar permissão")}
                          </button>
                          <button disabled={!!busy} onClick={() => act(l.id_link, "block")} className={`${btn} bg-[#15120E] text-red-300`} aria-label={t("block", "Bloquear")}>
                            <Ban className="h-4 w-4" />
                          </button>
                        </>,
                        l.status === "silenced" ? t("silencedNote", "silenciado") : t("activeNote", "ativo")
                      )
                    )}
                  </AnimatePresence>
                </ul>
              )}

              {closedIn.length > 0 && (
                <>
                  <h2 className="mt-10 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("closedIn", "Sem permissão / bloqueados")}</h2>
                  <ul className="mt-3 space-y-2">
                    {closedIn.map((l) =>
                      row(
                        l,
                        l.status === "blocked" ? (
                          <button disabled={!!busy} onClick={() => act(l.id_link, "unblock")} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
                            {t("unblock", "Desbloquear")}
                          </button>
                        ) : null,
                        l.status === "blocked" ? t("blockedNote", "bloqueado") : t("revokedNote", "permissão retirada")
                      )
                    )}
                  </ul>
                </>
              )}

              {/* para quem eu lanço */}
              <h2 className="mt-10 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("sending", "Para quem você lança")}</h2>
              {sending.length === 0 ? (
                <p className="mt-2 text-sm text-[#9A938A]">{t("sendingEmpty", "Convide alguém pelo @ aí em cima.")}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  <AnimatePresence initial={false}>
                    {sending.map((l) =>
                      row(
                        l,
                        <button disabled={!!busy} onClick={() => act(l.id_link, "cancel")} className={`${btn} bg-[#15120E] text-[#F5F1E8]`}>
                          <X className="h-4 w-4" />
                          {l.status === "pending" ? t("cancelInvite", "Cancelar convite") : t("stopThrowing", "Parar de lançar")}
                        </button>,
                        l.status === "pending" ? t("waitingNote", "esperando resposta") : t("activeNote", "ativo")
                      )
                    )}
                  </AnimatePresence>
                </ul>
              )}

              {/* privacidade */}
              <h2 className="mt-10 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("privacyTitle", "Quem pode me convidar")}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["todos", t("policyAll", "Qualquer pessoa")],
                    ["mutuos", t("policyMutual", "Só quem eu sigo e me segue")],
                    ["ninguem", t("policyNobody", "Ninguém")],
                  ] as [Policy, string][]
                ).map(([p, label]) => (
                  <button
                    key={p}
                    disabled={busy === "policy"}
                    onClick={() => savePolicy(p)}
                    className={`${btn} ${data?.prefs.invite_policy === p ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* som e vibração */}
          <h2 className="mt-10 text-xs font-black uppercase tracking-[0.25em] text-[#9A938A]">{t("fxTitle", "Som e vibração do feed")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => toggleFx("sound")} className={`${btn} ${prefs.sound ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]"}`}>
              <Volume2 className="h-4 w-4" />
              {prefs.sound ? t("soundOn", "Som ligado") : t("soundOff", "Som desligado")}
            </button>
            <button onClick={() => toggleFx("haptic")} className={`${btn} ${prefs.haptic ? "bg-[#F2B705] text-black" : "bg-[#15120E] text-[#F5F1E8]"}`}>
              <Vibrate className="h-4 w-4" />
              {prefs.haptic ? t("hapticOn", "Vibração ligada") : t("hapticOff", "Vibração desligada")}
            </button>
          </div>
          {!canVibrate() && (
            <p className="mt-2 text-xs text-[#9A938A]">{t("noVibrate", "Este aparelho não vibra pelo navegador (o iPhone não deixa).")}</p>
          )}
          <details className="mt-4">
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-[#9A938A]">{t("soundTest", "Ouvir os sons")}</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {SOUNDS.map((s) => (
                <button key={s} onClick={() => play(s)} className={`${btn} h-8 bg-[#15120E] px-2 text-[10px] text-[#F5F1E8]`}>
                  <Play className="h-3 w-3" />
                  {s}
                </button>
              ))}
            </div>
          </details>
        </div>
      </Section>
    </PageShell>
  )
}
