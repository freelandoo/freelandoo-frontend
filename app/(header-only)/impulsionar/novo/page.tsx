"use client"

// /impulsionar/novo — criar campanha em 5 passos (Post → Objetivo → Onde →
// Orçamento → Revisar). A estimativa (visualizações, pessoas, público possível)
// atualiza enquanto mexe, como no Meta. `?post=<id>` já abre com o post.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Eye, Loader2, MessageCircle, UserRound } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { adsApi, TIER_ORDER, type AdConfig, type AdEstimate, type AdObjective, type AdTier } from "@/lib/ads-api"
import { AdsShell, CountUp, TierRings, useMoney, useTierLabel } from "@/components/ads/ads-ui"

interface MyPost {
  id_portfolio_item: string
  title: string | null
  description?: string | null
  feed_kind?: string
  media: { media_url: string; media_type: "image" | "video"; thumbnail_url?: string | null }[]
}

const BUDGET_PRESETS = [1000, 2500, 5000, 10000, 25000, 50000]

export default function NewCampaign() {
  const t = useTranslations("Ads")
  const router = useRouter()
  const { brl, num } = useMoney()
  const tierLabel = useTierLabel()
  const [cfg, setCfg] = useState<AdConfig | null>(null)
  const [posts, setPosts] = useState<MyPost[] | null>(null)
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [postId, setPostId] = useState<string | null>(null)
  const [objective, setObjective] = useState<AdObjective>("views")
  const [tier, setTier] = useState<AdTier>("cidade")
  const [budget, setBudget] = useState(2500)
  const [days, setDays] = useState(7)
  const [est, setEst] = useState<AdEstimate | null>(null)
  const [estErr, setEstErr] = useState<string | null>(null)
  const [audiences, setAudiences] = useState<Partial<Record<AdTier, number>>>({})
  const [paying, setPaying] = useState(false)
  const estTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    adsApi<AdConfig>("/config").then(setCfg).catch(() => {})
    fetch("/api/me/portfolio", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPosts((Array.isArray(d) ? d : d?.items || []).filter((p: MyPost) => p.feed_kind !== "bees")))
      .catch(() => setPosts([]))
    const q = new URLSearchParams(window.location.search).get("post")
    if (q) {
      setPostId(q)
      setStep(1)
    }
  }, [])

  const go = (n: number) => {
    setDir(n > step ? 1 : -1)
    setStep(n)
  }

  // Público possível de cada degrau (mostrado nos cartões do passo "Onde").
  useEffect(() => {
    if (!postId || step !== 2) return
    for (const tr of TIER_ORDER) {
      adsApi<AdEstimate>(`/estimativa?post_id=${postId}&tier=${tr}&budget_cents=${cfg?.min_budget_cents || 1000}&days=1`)
        .then((e) => setAudiences((a) => ({ ...a, [tr]: e.audience })))
        .catch(() => setAudiences((a) => ({ ...a, [tr]: -1 })))
    }
  }, [postId, step, cfg?.min_budget_cents])

  const estimate = useCallback(() => {
    if (!postId) return
    if (estTimer.current) clearTimeout(estTimer.current)
    estTimer.current = setTimeout(() => {
      adsApi<AdEstimate>(`/estimativa?post_id=${postId}&tier=${tier}&budget_cents=${budget}&days=${days}`)
        .then((e) => {
          setEst(e)
          setEstErr(null)
        })
        .catch((e) => {
          setEst(null)
          setEstErr(e instanceof Error ? e.message : "erro")
        })
    }, 220)
  }, [postId, tier, budget, days])
  useEffect(() => {
    if (step >= 2) estimate()
  }, [step, estimate])

  const post = posts?.find((p) => p.id_portfolio_item === postId) || null
  const thumbOf = (p: MyPost | null) => {
    const m = p?.media?.[0]
    return m ? (m.media_type === "video" ? m.thumbnail_url : m.media_url) : null
  }
  const cpm = cfg?.tiers.find((x) => x.tier === tier)?.cpm_cents || 0
  const credit = cfg?.credit_cents || 0
  const toPay = useMemo(() => {
    let used = Math.min(credit, budget)
    let pay = budget - used
    if (pay > 0 && pay < 100) {
      used = Math.max(0, budget - 100)
      pay = budget - used
    }
    return { used, pay }
  }, [credit, budget])

  const pay = async () => {
    if (!postId || paying) return
    setPaying(true)
    try {
      const r = await adsApi<{ id_campaign: string; checkout_url?: string; active?: boolean }>("", {
        method: "POST",
        body: { post_id: postId, objective, tier, budget_cents: budget, days },
      })
      if (r.checkout_url) window.location.href = r.checkout_url
      else router.push(`/impulsionar/${r.id_campaign}?no-ar=1`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
      setPaying(false)
    }
  }

  const STEPS = [t("stepPost", "Post"), t("stepGoal", "Objetivo"), t("stepWhere", "Onde"), t("stepBudget", "Orçamento"), t("stepReview", "Revisar")]
  const canNext = [!!postId, true, !!tier, !!est && !estErr, true][step]
  const maxBudget = Math.min(cfg?.max_budget_cents || 5000000, 200000)

  const objectives: { id: AdObjective; icon: typeof Eye; title: string; text: string; disabled?: boolean }[] = [
    { id: "views", icon: Eye, title: t("objViews", "Mais gente vendo"), text: t("objViewsText", "Seu post aparece para mais pessoas da área.") },
    { id: "profile", icon: UserRound, title: t("objProfile", "Visitas ao perfil"), text: t("objProfileText", "O post ganha o botão Ver perfil.") },
    { id: "whatsapp", icon: MessageCircle, title: t("objWhats", "Conversas no WhatsApp"), text: t("objWhatsText", "O post ganha o botão Chamar no WhatsApp.") },
  ]

  return (
    <AdsShell back="/impulsionar">
      <p className="fa-label" style={{ color: "var(--fa-y)" }}>
        {t("newCampaign", "Nova campanha")}
      </p>
      {/* trilho dos passos */}
      <ol className="mt-3 grid grid-cols-5 gap-1">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              disabled={i > step && !(i === step + 1 && canNext)}
              onClick={() => i <= step && go(i)}
              className="block w-full text-left"
            >
              <motion.span className="block h-1.5 origin-left" style={{ background: i <= step ? "var(--fa-y)" : "var(--fa-surface-3)" }} initial={false} animate={{ scaleX: i <= step ? 1 : 0.6 }} />
              <span className="fa-label mt-1.5 block truncate" style={i === step ? { color: "var(--fa-white)" } : undefined}>
                {String(i + 1).padStart(2, "0")} · {s}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="relative mt-8 min-h-[420px]">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <section>
                <h2 className="fa-display text-5xl">{t("qPost", "Qual post?")}</h2>
                {!posts ? (
                  <Loader2 className="mt-6 h-6 w-6 animate-spin" />
                ) : posts.length === 0 ? (
                  <p className="mt-6" style={{ color: "var(--fa-muted)" }}>
                    {t("noPosts", "Publique um post no feed primeiro.")}
                  </p>
                ) : (
                  <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {posts.slice(0, 40).map((p) => {
                      const src = thumbOf(p)
                      const on = p.id_portfolio_item === postId
                      return (
                        <motion.button
                          key={p.id_portfolio_item}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPostId(p.id_portfolio_item)}
                          className="fa-hover relative aspect-[4/5] overflow-hidden"
                          style={{ border: on ? "3px solid var(--fa-y)" : "1px solid var(--fa-line-strong)", boxShadow: on ? "4px 4px 0 0 var(--fa-y)" : undefined }}
                        >
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt="" className="fa-photo h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="block h-full w-full p-2 text-left text-[11px] font-bold" style={{ background: "var(--fa-surface-2)" }}>
                              {p.title || p.description}
                            </span>
                          )}
                          <span className="fa-photo-tint" style={on ? { opacity: 0.3 } : undefined} />
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {step === 1 && (
              <section>
                <h2 className="fa-display text-5xl">{t("qGoal", "O que você quer?")}</h2>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {objectives.map((o) => {
                    const Icon = o.icon
                    return (
                      <button key={o.id} type="button" data-on={objective === o.id} onClick={() => setObjective(o.id)} className="fa-option p-5">
                        <Icon className="h-7 w-7" style={{ color: objective === o.id ? "var(--fa-y)" : "var(--fa-white)" }} />
                        <div className="fa-display mt-4 text-2xl">{o.title}</div>
                        <p className="mt-2 text-sm" style={{ color: "var(--fa-muted)" }}>
                          {o.text}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {step === 2 && (
              <section>
                <h2 className="fa-display text-5xl">{t("qWhere", "Onde aparece?")}</h2>
                <p className="mt-2 text-sm" style={{ color: "var(--fa-muted)" }}>
                  {t("whereLead", "A partir do lugar do seu post. Quanto mais longe, mais caro por mil visualizações.")}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  {TIER_ORDER.map((tr, i) => {
                    const c = cfg?.tiers.find((x) => x.tier === tr)?.cpm_cents || 0
                    const aud = audiences[tr]
                    return (
                      <button key={tr} type="button" data-on={tier === tr} onClick={() => setTier(tr)} disabled={aud === -1} className="fa-option p-4 disabled:opacity-40">
                        <TierRings level={i} size={56} />
                        <div className="fa-display mt-4 text-3xl">{tierLabel(tr)}</div>
                        <div className="fa-mono mt-1 text-xs" style={{ color: "var(--fa-y)" }}>
                          {brl(c)} / {t("perThousand", "mil")}
                        </div>
                        <div className="fa-mono mt-2 text-[11px]" style={{ color: "var(--fa-muted)" }}>
                          {aud === undefined ? "…" : aud === -1 ? t("tierUnavailable", "indisponível para este post") : `${num(aud)} ${t("possibleAudience", "no público")}`}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="grid gap-8 lg:grid-cols-[1fr_340px]">
                <div>
                  <h2 className="fa-display text-5xl">{t("qBudget", "Quanto e por quanto tempo?")}</h2>
                  <div className="fa-label mt-6">{t("budgetTotal", "Orçamento total")}</div>
                  <div className="fa-display mt-2 text-6xl" style={{ color: "var(--fa-y)" }}>
                    {brl(budget)}
                  </div>
                  <input
                    type="range"
                    className="fa-range mt-4"
                    min={cfg?.min_budget_cents || 1000}
                    max={maxBudget}
                    step={500}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    aria-label={t("budgetTotal", "Orçamento total")}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {BUDGET_PRESETS.map((b) => (
                      <button key={b} type="button" onClick={() => setBudget(b)} className={b === budget ? "fa-sticker fa-sticker-y" : "fa-sticker fa-sticker-dark"}>
                        {brl(b)}
                      </button>
                    ))}
                  </div>
                  <div className="fa-label mt-8">{t("duration", "Duração")}</div>
                  <div className="fa-display mt-2 text-5xl">
                    {days} {days === 1 ? t("day", "dia") : t("days", "dias")}
                  </div>
                  <input
                    type="range"
                    className="fa-range mt-4"
                    min={1}
                    max={cfg?.max_days || 30}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    aria-label={t("duration", "Duração")}
                  />
                </div>
                {/* estimativa ao vivo */}
                <aside className="fa-card-y fa-scan relative p-5" style={{ background: "var(--fa-surface)" }}>
                  <div className="relative z-[3]">
                    <div className="flex items-center gap-2">
                      <span className="fa-live-dot" />
                      <span className="fa-label" style={{ color: "var(--fa-y)" }}>
                        {t("estimateTitle", "Estimativa")}
                      </span>
                    </div>
                    {estErr ? (
                      <p className="mt-4 text-sm font-bold" style={{ color: "var(--fa-down)" }}>
                        {estErr}
                      </p>
                    ) : !est ? (
                      <Loader2 className="mt-4 h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <div className="fa-label mt-5">{t("estPeople", "Pessoas alcançadas")}</div>
                        <div className="fa-display mt-1 text-5xl">
                          <CountUp value={est.reach_low} format={num} />–<CountUp value={est.reach_high} format={num} />
                        </div>
                        <div className="fa-label mt-5">{t("estViews", "Visualizações")}</div>
                        <div className="fa-display mt-1 text-4xl" style={{ color: "var(--fa-y)" }}>
                          <CountUp value={est.impressions} format={num} />
                        </div>
                        <div className="fa-mono mt-4 space-y-1 text-xs" style={{ color: "var(--fa-muted)" }}>
                          <div>
                            {num(est.per_day)} {t("perDay", "por dia")} · {brl(est.cpm_cents)} / {t("perThousand", "mil")}
                          </div>
                          <div>
                            {num(est.audience)} {t("possibleAudience", "no público")} · {est.place.city_name || est.place.region_name || est.place.uf || t("tierBrasil", "Brasil")}
                          </div>
                        </div>
                        {est.saturated && (
                          <p className="mt-3 text-xs font-bold" style={{ color: "var(--fa-y)" }}>
                            {t("saturated", "Orçamento alto para essa área: as mesmas pessoas vão ver mais vezes. Tente uma área maior.")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </aside>
              </section>
            )}

            {step === 4 && (
              <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div>
                  <h2 className="fa-display text-5xl">{t("qReview", "Tudo certo?")}</h2>
                  <dl className="mt-6 divide-y" style={{ borderColor: "var(--fa-line)" }}>
                    {[
                      [t("stepGoal", "Objetivo"), objectives.find((o) => o.id === objective)?.title],
                      [t("stepWhere", "Onde"), `${tierLabel(tier)}${est?.place?.city_name && tier === "cidade" ? ` · ${est.place.city_name}` : est?.place?.uf && tier !== "brasil" ? ` · ${est.place.uf}` : ""}`],
                      [t("duration", "Duração"), `${days} ${days === 1 ? t("day", "dia") : t("days", "dias")}`],
                      [t("estViews", "Visualizações"), est ? num(est.impressions) : "—"],
                      [t("estPeople", "Pessoas alcançadas"), est ? `${num(est.reach_low)}–${num(est.reach_high)}` : "—"],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="flex justify-between gap-4 py-3" style={{ borderColor: "var(--fa-line)" }}>
                        <dt className="fa-label">{k}</dt>
                        <dd className="text-right font-bold">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-xs" style={{ color: "var(--fa-muted)" }}>
                    {t("leftoverNote", "O que não for entregue até o fim volta como crédito de anúncio para a próxima campanha.")}
                  </p>
                </div>
                <aside className="fa-card-y p-5" style={{ background: "var(--fa-surface)" }}>
                  <div className="flex gap-3">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden" style={{ background: "var(--fa-surface-3)" }}>
                      {thumbOf(post) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbOf(post)!} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="fa-sticker fa-sticker-y absolute left-1 top-1" style={{ padding: "1px 4px", fontSize: 8 }}>
                        {t("sponsored", "Impulsionado")}
                      </span>
                    </div>
                    <div className="min-w-0 text-sm font-bold">{post?.title || post?.description || t("untitledPost", "Post sem título")}</div>
                  </div>
                  <div className="mt-5 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--fa-muted)" }}>{t("budgetTotal", "Orçamento total")}</span>
                      <span className="fa-mono">{brl(budget)}</span>
                    </div>
                    {toPay.used > 0 && (
                      <div className="flex justify-between" style={{ color: "var(--fa-up)" }}>
                        <span>{t("creditApplied", "Crédito usado")}</span>
                        <span className="fa-mono">−{brl(toPay.used)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 text-base font-black" style={{ borderColor: "var(--fa-line)" }}>
                      <span>{t("toPay", "A pagar")}</span>
                      <span className="fa-mono" style={{ color: "var(--fa-y)" }}>
                        {brl(toPay.pay)}
                      </span>
                    </div>
                  </div>
                  <button type="button" onClick={pay} disabled={paying || !est} className="fa-btn mt-5 w-full">
                    {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {toPay.pay > 0 ? t("payAndLaunch", "Pagar e pôr no ar") : t("launch", "Pôr no ar com crédito")}
                  </button>
                  <p className="mt-3 text-[11px]" style={{ color: "var(--fa-faint)" }}>
                    {t("sponsoredNote", "O post aparece com a etiqueta Impulsionado, como manda a lei.")}
                  </p>
                </aside>
              </section>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* navegação */}
      <div className="mt-8 flex items-center justify-between">
        <button type="button" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0} className="fa-btn fa-btn-ghost">
          <ArrowLeft className="h-4 w-4" />
          {t("back", "Voltar")}
        </button>
        {step < 4 && (
          <button type="button" onClick={() => go(step + 1)} disabled={!canNext} className="fa-btn">
            {t("next", "Continuar")}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </AdsShell>
  )
}
