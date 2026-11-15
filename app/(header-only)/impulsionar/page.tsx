"use client"

// /impulsionar — FREELANDOO ADS: o painel. Totais (visualizações, pessoas,
// cliques, investido), crédito de anúncio, faixa ao vivo e as campanhas.

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Loader2, Plus, Sparkles } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { adsApi, type AdCampaign } from "@/lib/ads-api"
import { AdsShell, CountUp, DeliveryBar, Marquee, StatusSticker, useMoney, useTierLabel } from "@/components/ads/ads-ui"

interface ListResp {
  campaigns: AdCampaign[]
  totals: { impressions: number; reach: number; clicks: number; spent_cents: number; live: number }
  credit_cents: number
}

export default function AdsHome() {
  const t = useTranslations("Ads")
  const { brl, num } = useMoney()
  const tierLabel = useTierLabel()
  const [data, setData] = useState<ListResp | null>(null)
  const [logged, setLogged] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setLogged(false)
      return
    }
    adsApi<ListResp>("")
      .then(setData)
      .catch(() => setData({ campaigns: [], totals: { impressions: 0, reach: 0, clicks: 0, spent_cents: 0, live: 0 }, credit_cents: 0 }))
  }, [])

  const tiles = data
    ? [
        { k: t("kpiViews", "Visualizações"), v: data.totals.impressions, f: num },
        { k: t("kpiReach", "Pessoas alcançadas"), v: data.totals.reach, f: num },
        { k: t("kpiClicks", "Cliques"), v: data.totals.clicks, f: num },
        { k: t("kpiSpent", "Investido"), v: data.totals.spent_cents, f: brl },
      ]
    : []

  return (
    <AdsShell>
      {/* herói */}
      <section className="relative">
        <div className="fa-halftone pointer-events-none absolute -right-6 -top-6 h-40 w-56 opacity-40" aria-hidden />
        <motion.p className="fa-script text-2xl" style={{ color: "var(--fa-y)" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {t("heroScript", "seu post, mais longe")}
        </motion.p>
        <h1 className="fa-display relative mt-1 text-6xl sm:text-8xl">
          <motion.span className="block" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
            {t("heroA", "Impulsione")}
          </motion.span>
          <motion.span className="fa-outline block" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
            {t("heroB", "sua cidade")}
          </motion.span>
          <motion.span className="block" style={{ color: "var(--fa-y)" }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}>
            {t("heroC", "ou o Brasil")}
          </motion.span>
        </h1>
        <p className="mt-5 max-w-xl text-base" style={{ color: "var(--fa-muted)" }}>
          {t("heroLead", "Escolha um post, onde ele vai aparecer e quanto quer investir. A gente mostra quantas pessoas ele alcança antes de você pagar.")}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link href="/impulsionar/novo" className="fa-btn">
            <Plus className="h-4 w-4" />
            {t("newCampaign", "Nova campanha")}
          </Link>
          {data && data.credit_cents > 0 && (
            <span className="fa-sticker">
              <Sparkles className="h-3 w-3" />
              {t("credit", "Crédito de anúncio")} {brl(data.credit_cents)}
            </span>
          )}
        </div>
      </section>

      {!logged ? (
        <p className="mt-10 font-bold" style={{ color: "var(--fa-y)" }}>
          {t("needLogin", "Entre na sua conta para anunciar.")}
        </p>
      ) : !data ? (
        <Loader2 className="mt-10 h-6 w-6 animate-spin" style={{ color: "var(--fa-muted)" }} />
      ) : (
        <>
          <div className="mt-10">
            <Marquee
              items={[
                `${data.totals.live} ${t("marqueeLive", "no ar agora")}`,
                `${num(data.totals.impressions)} ${t("marqueeViews", "visualizações")}`,
                `${num(data.totals.reach)} ${t("marqueeReach", "pessoas")}`,
                `${num(data.totals.clicks)} ${t("marqueeClicks", "cliques")}`,
              ]}
            />
          </div>

          {/* placar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((x, i) => (
              <motion.div
                key={x.k}
                className="fa-card p-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="fa-label">{x.k}</div>
                <div className="fa-display mt-2 text-4xl" style={{ color: i === 0 ? "var(--fa-y)" : "var(--fa-white)" }}>
                  <CountUp value={x.v} format={x.f} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* campanhas */}
          <h2 className="fa-label mt-12">{t("campaigns", "Suas campanhas")}</h2>
          {data.campaigns.length === 0 ? (
            <div className="fa-card fa-cut mt-3 p-8 text-center">
              <p className="fa-display text-3xl">{t("emptyTitle", "Nenhuma campanha ainda")}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--fa-muted)" }}>
                {t("emptyText", "Comece com R$ 10 na sua cidade e veja o resultado chegando ao vivo.")}
              </p>
            </div>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.campaigns.map((c, i) => (
                <motion.li key={c.id_campaign} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}>
                  <Link href={`/impulsionar/${c.id_campaign}`} className="fa-card fa-hover group flex gap-3 p-3 transition hover:border-[var(--fa-white)]">
                    <div className="relative h-24 w-20 shrink-0 overflow-hidden" style={{ background: "var(--fa-surface-3)" }}>
                      {c.post?.thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.post.thumb} alt="" className="fa-photo h-full w-full object-cover" loading="lazy" />
                      )}
                      <span className="fa-photo-tint" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusSticker status={c.status} />
                        <span className="fa-label">{tierLabel(c.tier)}</span>
                      </div>
                      <div className="mt-2 truncate text-sm font-black">{c.post?.title || t("untitledPost", "Post sem título")}</div>
                      <div className="fa-mono mt-1 text-xs" style={{ color: "var(--fa-muted)" }}>
                        {num(c.impressions)} / {num(c.goal_impressions)} · {num(c.reach)} {t("people", "pessoas")} · {brl(c.spent_cents)}
                      </div>
                      <div className="mt-2">
                        <DeliveryBar value={c.impressions} goal={c.goal_impressions} />
                      </div>
                    </div>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdsShell>
  )
}
