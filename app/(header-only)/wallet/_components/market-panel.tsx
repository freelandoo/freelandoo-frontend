"use client"

// O mercado — manchetes, cotações e ações em alta.
//
// Era uma barra lateral fixa (e um slide-over no celular), depois virou painel
// de um botão retrátil da /wallet, e agora é o conteúdo da página
// /wallet/mercado. Mudou de casa três vezes e nunca mudou de fonte: o snapshot
// continua vindo do CACHE DO BACKEND (scheduler do Railway) numa requisição só.
// Sem polling e sem fetch externo por request — a regra de custo da Vercel.

import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { LineChart, Newspaper, TrendingDown, TrendingUp } from "lucide-react"
import { clientFetchWithTimeout } from "@/lib/fetch-with-timeout"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"
import { Muted, RowsSkeleton, pct, type MarketItem, type NewsItem } from "./wallet-ui"

export function MarketPanel() {
  const tr = useTranslations("Wallet")
  const [data, setData] = useState<{ stocks: MarketItem[]; quotes: MarketItem[]; news: NewsItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    clientFetchWithTimeout("/api/market/snapshot", { cache: "no-store" }, 9000)
      .then((r) => r.json())
      .then((d) => setData({ stocks: d.stocks || [], quotes: d.quotes || [], news: d.news || [] }))
      .catch(() => setErr(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
        <MarketSection title={tr("marketPolitics", "Mercado & política")} icon={<Newspaper className="h-4 w-4" />}>
          {loading ? (
            <RowsSkeleton n={3} />
          ) : data?.news?.length ? (
            data.news.map((n) => <NewsRow key={n.id} item={n} />)
          ) : (
            <Muted>{tr("noHeadlines", "Sem manchetes por enquanto.")}</Muted>
          )}
        </MarketSection>
      </div>
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
        <MarketSection title={tr("quotes", "Cotações")} icon={<LineChart className="h-4 w-4" />}>
          {loading ? (
            <RowsSkeleton n={4} />
          ) : err || !data?.quotes.length ? (
            <Muted>{tr("noQuotes", "Cotações indisponíveis no momento.")}</Muted>
          ) : (
            data.quotes.map((q) => <QuoteRow key={q.symbol} item={q} />)
          )}
        </MarketSection>
      </div>
      <div className="border-2 border-[#0B0B0D] bg-[#F1EDE2] p-4 shadow-[5px_5px_0_0_#0B0B0D]">
        <MarketSection title={tr("stocksUp", "Ações em alta")} icon={<TrendingUp className="h-4 w-4" />}>
          {loading ? (
            <RowsSkeleton n={4} />
          ) : err || !data?.stocks.length ? (
            <Muted>{tr("noStocks", "Sem dados de ações no momento.")}</Muted>
          ) : (
            data.stocks.slice(0, 5).map((s) => <QuoteRow key={s.symbol} item={s} />)
          )}
        </MarketSection>
      </div>
    </div>
  )
}

function MarketSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B6457]">
        {icon} {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function QuoteRow({ item }: { item: MarketItem }) {
  const locale = useLocale()
  const up = (item.change_pct ?? 0) >= 0
  const isPts = item.currency === "pts"
  const small = item.price != null && item.price < 1
  const price =
    item.price == null
      ? "—"
      : isPts
        ? item.price.toLocaleString(locale, { maximumFractionDigits: 0 })
        : item.price.toLocaleString(locale, {
            style: "currency",
            currency: "BRL",
            minimumFractionDigits: small ? 4 : 2,
            maximumFractionDigits: small ? 4 : 2,
          })
  return (
    <div className="flex items-center justify-between gap-2 border border-[#0B0B0D]/20 bg-white/60 px-2.5 py-1.5">
      <div className="flex min-w-0 items-center gap-2">
        {item.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.logo_url} alt="" className="h-5 w-5 shrink-0 object-contain" />
        ) : (
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center border border-[#0B0B0D]/40 text-[9px] font-black text-[#0B0B0D]">
            {item.symbol.replace(/[^A-Z]/g, "").slice(0, 2) || "$"}
          </span>
        )}
        <span className="truncate text-xs font-extrabold uppercase tracking-wide text-[#0B0B0D]">{item.label}</span>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="text-xs font-black tabular-nums text-[#0B0B0D]">{price}</span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-[10px] font-bold tabular-nums",
            up ? "text-[#00876B]" : "text-[#9A3412]"
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {pct(item.change_pct)}
        </span>
      </div>
    </div>
  )
}

function NewsRow({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 border border-[#0B0B0D]/20 bg-white/60 p-2 transition hover:border-[#0B0B0D]"
    >
      <span className="h-12 w-16 shrink-0 overflow-hidden border border-[#0B0B0D]/30 bg-[#0B0B0D]/[0.06]">
        {item.thumb_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </span>
      <div className="min-w-0">
        <p className="line-clamp-2 text-[11px] font-bold leading-snug text-[#0B0B0D]">{item.title}</p>
        {item.source && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6457]">{item.source}</p>
        )}
      </div>
    </a>
  )
}
