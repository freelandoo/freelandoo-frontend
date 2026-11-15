"use client"

// /impulsionar/[id] — uma campanha: entrega x meta, pessoas, cliques, taxa de
// clique, investido, gráfico por dia, e pausar / retomar / cancelar.
// Volta do checkout (?pago=1): o webhook pode chegar um pouco depois — relê
// duas vezes (4 s e 12 s), sem poll contínuo.

import { use, useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Loader2, Pause, Play, X } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { getToken } from "@/lib/auth"
import { adsApi, type AdCampaign } from "@/lib/ads-api"
import { AdsShell, CountUp, DeliveryBar, StatusSticker, useMoney, useTierLabel } from "@/components/ads/ads-ui"

interface DetailResp {
  campaign: AdCampaign
  daily: { day: string; impressions: number; clicks: number }[]
  credit_cents: number
}

function DailyChart({ daily }: { daily: DetailResp["daily"] }) {
  const locale = useLocale()
  const t = useTranslations("Ads")
  if (!daily.length) {
    return (
      <p className="fa-mono text-xs" style={{ color: "var(--fa-muted)" }}>
        {t("chartEmpty", "Os números de cada dia aparecem aqui assim que a campanha começar a entregar.")}
      </p>
    )
  }
  const max = Math.max(1, ...daily.map((d) => d.impressions))
  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label={t("chartAria", "Visualizações por dia")}>
      {daily.map((d, i) => (
        <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="fa-mono text-[10px]" style={{ color: "var(--fa-muted)" }}>
            {d.impressions}
          </span>
          <motion.div
            className="w-full origin-bottom"
            style={{ height: `${(d.impressions / max) * 100}%`, minHeight: 2, background: "var(--fa-y)" }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.04, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <span className="fa-mono truncate text-[9px]" style={{ color: "var(--fa-faint)" }}>
            {new Date(`${String(d.day).slice(0, 10)}T12:00:00`).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations("Ads")
  const locale = useLocale()
  const { brl, num } = useMoney()
  const tierLabel = useTierLabel()
  const [data, setData] = useState<DetailResp | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState<"paid" | "live" | null>(null)

  const load = useCallback(() => {
    adsApi<DetailResp>(`/${id}`)
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "erro"))
  }, [id])

  useEffect(() => {
    if (!getToken()) {
      setErr(t("needLogin", "Entre na sua conta para anunciar."))
      return
    }
    load()
    const q = new URLSearchParams(window.location.search)
    if (q.get("pago")) {
      setBanner("paid")
      const a = window.setTimeout(load, 4000)
      const b = window.setTimeout(load, 12000)
      window.history.replaceState(null, "", window.location.pathname)
      return () => {
        window.clearTimeout(a)
        window.clearTimeout(b)
      }
    }
    if (q.get("no-ar")) {
      setBanner("live")
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [load, t])

  const act = async (action: "pause" | "resume" | "cancel") => {
    if (action === "cancel" && !window.confirm(t("cancelConfirm", "Cancelar? O que não foi entregue volta como crédito."))) return
    setBusy(true)
    try {
      setData(await adsApi<DetailResp>(`/${id}/${action}`, { method: "POST" }))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("genericError", "Não deu certo"))
    } finally {
      setBusy(false)
    }
  }

  if (err) {
    return (
      <AdsShell back="/impulsionar">
        <p className="font-bold" style={{ color: "var(--fa-down)" }}>
          {err}
        </p>
      </AdsShell>
    )
  }
  if (!data) {
    return (
      <AdsShell back="/impulsionar">
        <Loader2 className="h-6 w-6 animate-spin" />
      </AdsShell>
    )
  }
  const c = data.campaign
  const clicks = c.clicks_profile + c.clicks_whatsapp
  const ctr = c.impressions ? (clicks / c.impressions) * 100 : 0
  const media = c.post?.media?.[0]
  const thumb = media ? (media.type === "video" ? media.thumbnail_url : media.url) : null
  const place = c.tier === "brasil" ? t("tierBrasil", "Brasil") : c.tier === "cidade" ? c.place.city_name : c.tier === "regiao" ? c.place.region_name : c.place.uf
  const kpis = [
    { k: t("kpiViews", "Visualizações"), v: c.impressions, f: num, sub: `${t("of", "de")} ${num(c.goal_impressions)}` },
    { k: t("kpiReach", "Pessoas alcançadas"), v: c.reach, f: num },
    { k: t("kpiClicks", "Cliques"), v: clicks, f: num, sub: `${ctr.toFixed(1)}% ${t("ctr", "dos que viram")}` },
    { k: t("kpiSpent", "Investido"), v: c.spent_cents, f: brl, sub: `${t("of", "de")} ${brl(c.budget_cents)}` },
  ]

  return (
    <AdsShell back="/impulsionar">
      <AnimatePresence>
        {banner && (
          <motion.div
            className="fa-card-y mb-6 p-4"
            style={{ background: "var(--fa-surface)" }}
            initial={{ y: -16, opacity: 0, rotate: -1 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="fa-display text-3xl" style={{ color: "var(--fa-y)" }}>
              {banner === "live" ? t("bannerLive", "No ar!") : c.status === "active" ? t("bannerLive", "No ar!") : t("bannerPaid", "Pagamento recebido")}
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--fa-muted)" }}>
              {c.status === "active"
                ? t("bannerLiveText", "Seu post já está entrando no feed das pessoas da área.")
                : t("bannerPaidText", "Assim que o Mercado Pago confirmar, a campanha entra no ar sozinha.")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid gap-6 md:grid-cols-[200px_1fr]">
        <div className="fa-hover relative aspect-[4/5] w-full max-w-[200px] overflow-hidden" style={{ background: "var(--fa-surface-3)", border: "1px solid var(--fa-line-strong)" }}>
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="fa-photo h-full w-full object-cover" />
          )}
          <span className="fa-photo-tint" />
          <span className="fa-sticker fa-sticker-y absolute left-2 top-2">{t("sponsored", "Impulsionado")}</span>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusSticker status={c.status} />
            <span className="fa-label">
              {tierLabel(c.tier)}
              {place ? ` · ${place}` : ""}
            </span>
          </div>
          <h1 className="fa-display mt-3 text-5xl sm:text-6xl">{c.post?.title || c.post?.caption || t("untitledPost", "Post sem título")}</h1>
          <p className="fa-mono mt-3 text-xs" style={{ color: "var(--fa-muted)" }}>
            {c.start_at ? new Date(c.start_at).toLocaleDateString(locale) : "—"} → {c.end_at ? new Date(c.end_at).toLocaleDateString(locale) : "—"} · {brl(c.cpm_cents)} / {t("perThousand", "mil")}
          </p>
          <div className="mt-4">
            <DeliveryBar value={c.impressions} goal={c.goal_impressions} />
            <div className="fa-mono mt-1 text-[11px]" style={{ color: "var(--fa-muted)" }}>
              {Math.round((c.impressions / Math.max(1, c.goal_impressions)) * 100)}% {t("delivered", "entregue")}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {c.status === "active" && (
              <button type="button" disabled={busy} onClick={() => act("pause")} className="fa-btn fa-btn-ghost">
                <Pause className="h-4 w-4" />
                {t("pause", "Pausar")}
              </button>
            )}
            {c.status === "paused" && (
              <button type="button" disabled={busy} onClick={() => act("resume")} className="fa-btn">
                <Play className="h-4 w-4" />
                {t("resume", "Retomar")}
              </button>
            )}
            {(c.status === "active" || c.status === "paused") && (
              <button type="button" disabled={busy} onClick={() => act("cancel")} className="fa-btn fa-btn-ghost">
                <X className="h-4 w-4" />
                {t("cancel", "Cancelar")}
              </button>
            )}
          </div>
          {c.credited_back_cents > 0 && (
            <p className="mt-4 text-sm font-bold" style={{ color: "var(--fa-up)" }}>
              {t("creditedBack", "{v} voltaram como crédito de anúncio.").replace("{v}", brl(c.credited_back_cents))}
            </p>
          )}
        </div>
      </section>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((x, i) => (
          <motion.div key={x.k} className="fa-card p-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <div className="fa-label">{x.k}</div>
            <div className="fa-display mt-2 text-4xl" style={{ color: i === 0 ? "var(--fa-y)" : undefined }}>
              <CountUp value={x.v} format={x.f} />
            </div>
            {x.sub && (
              <div className="fa-mono mt-1 text-[11px]" style={{ color: "var(--fa-muted)" }}>
                {x.sub}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <section className="fa-card mt-6 p-5">
        <div className="fa-label mb-4">{t("chartTitle", "Visualizações por dia")}</div>
        <DailyChart daily={data.daily} />
        {(c.clicks_profile > 0 || c.clicks_whatsapp > 0) && (
          <div className="fa-mono mt-4 flex gap-6 text-xs" style={{ color: "var(--fa-muted)" }}>
            <span>
              {t("clicksProfile", "Perfil")}: {num(c.clicks_profile)}
            </span>
            <span>
              WhatsApp: {num(c.clicks_whatsapp)}
            </span>
          </div>
        )}
      </section>
    </AdsShell>
  )
}
