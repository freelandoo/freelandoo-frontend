"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft, CheckCircle2, CreditCard, Hourglass, Info, RotateCcw,
  Sparkles, Ticket, Briefcase, Package, GraduationCap, Users,
  Wallet, TrendingUp, Loader2, ArrowDownRight, ShoppingBag,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/* ──────────────────────────────────────────────────────────────────── */
/*  Types                                                              */
/* ──────────────────────────────────────────────────────────────────── */
type Affiliate = {
  id_affiliate: string
  id_user: string
  status: "ACTIVE" | "PAUSED" | "BLOCKED"
  pix_key: string | null
  pix_key_type: string | null
  legal_name: string | null
  tax_id: string | null
}

type DefaultRule = {
  commission_percent: number
  commission_base: "GROSS" | "NET_OF_DISCOUNT"
  min_order_cents: number
  max_commission_cents: number | null
  approval_delay_days: number
}

type Coupon = {
  id_coupon: string
  code: string
  discount_type: string
  value: string | number
  is_active: boolean
}

type EarningKind = "service" | "product" | "course" | "affiliate"
type EarningStatus = "pending" | "available" | "paid" | "reversed"

type Earning = {
  kind: EarningKind
  id: string
  ref_id: string
  title: string
  status: EarningStatus
  gross_cents: number
  net_cents: number
  created_at: string
  available_at: string | null
  paid_at: string | null
  meta: Record<string, unknown> | null
}

type Aggregates = {
  by_kind: Record<EarningKind, {
    received?: number
    pending?: number
    available?: number
    reversed?: number
  }>
  totals: { received: number; pending: number; available: number; reversed: number; count: number }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Helpers                                                            */
/* ──────────────────────────────────────────────────────────────────── */
const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const formatDate = (iso: string | null) => {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR")
}

const KIND_META: Record<EarningKind, { label: string; icon: typeof Briefcase; accent: string }> = {
  service:   { label: "Serviço",  icon: Briefcase,      accent: "from-sky-400/20 to-cyan-400/10 text-sky-300" },
  product:   { label: "Produto",  icon: Package,        accent: "from-emerald-400/20 to-teal-400/10 text-emerald-300" },
  course:    { label: "Curso",    icon: GraduationCap,  accent: "from-violet-400/20 to-fuchsia-400/10 text-violet-300" },
  affiliate: { label: "Afiliado", icon: Users,          accent: "from-yellow-400/25 to-amber-500/15 text-yellow-300" },
}

const STATUS_META: Record<EarningStatus, { label: string; color: string }> = {
  pending:   { label: "Aguardando", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  available: { label: "Disponível", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  paid:      { label: "Pago",       color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  reversed:  { label: "Revertido",  color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
}

type Tab = "all" | EarningKind | "afiliado" | "cupom"

type CouponSale = {
  id: string
  created_at: string
  status: "pending" | "available" | "paid" | "reversed"
  raw_status: string
  coupon_code: string | null
  order: { id: string; paid_at: string | null; status: string }
  buyer: { id: string; name: string | null; email: string | null }
  item: { name: string | null; count: number }
  amounts: {
    gross_cents: number
    discount_cents: number
    final_cents: number
    commission_cents: number
    commission_percent: number | string
  }
  timeline: {
    eligible_at: string | null
    approved_at: string | null
    paid_at: string | null
  }
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Page                                                               */
/* ──────────────────────────────────────────────────────────────────── */
export default function MeusFaturamentosPage() {
  const [tab, setTab] = useState<Tab>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Earnings
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [aggregates, setAggregates] = useState<Aggregates | null>(null)

  // Coupon sales
  const [couponSales, setCouponSales] = useState<CouponSale[]>([])
  const [couponPage, setCouponPage] = useState(1)
  const [couponTotalPages, setCouponTotalPages] = useState(1)

  // Affiliate
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [defaultRule, setDefaultRule] = useState<DefaultRule | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [pixForm, setPixForm] = useState({ pix_key: "", pix_key_type: "", legal_name: "", tax_id: "" })
  const [savingPix, setSavingPix] = useState(false)
  const [pixSaved, setPixSaved] = useState(false)

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

  const loadEarnings = useCallback(async (kind: Tab) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const kindParam = kind === "all" || kind === "afiliado" ? "all" : kind
      const res = await fetch(`/api/me/earnings?kind=${kindParam}&per_page=60`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setEarnings(Array.isArray(data.items) ? data.items : [])
      setAggregates(data.aggregates || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadCouponSales = useCallback(async (page: number) => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/me/earnings/coupon-sales?page=${page}&per_page=24`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCouponSales(Array.isArray(data.items) ? data.items : [])
      setCouponTotalPages(Math.max(1, Number(data?.pagination?.total_pages) || 1))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar")
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadAffiliate = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch("/api/me/affiliate", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setAffiliate(data.affiliate || null)
      setDefaultRule(data.default_rule || null)
      setCoupons(Array.isArray(data.coupons) ? data.coupons : [])
      if (data.affiliate) {
        setPixForm({
          pix_key: data.affiliate.pix_key || "",
          pix_key_type: data.affiliate.pix_key_type || "",
          legal_name: data.affiliate.legal_name || "",
          tax_id: data.affiliate.tax_id || "",
        })
      }
    } catch { /* silent */ }
  }, [token])

  useEffect(() => {
    if (!token) {
      setError("Faça login para ver seus faturamentos.")
      setLoading(false)
      return
    }
    if (tab === "cupom") {
      loadCouponSales(couponPage)
    } else {
      loadEarnings(tab)
    }
  }, [tab, token, loadEarnings, loadCouponSales, couponPage])

  useEffect(() => { loadAffiliate() }, [loadAffiliate])

  const handleSavePix = async () => {
    if (!token) return
    setSavingPix(true)
    setPixSaved(false)
    try {
      const res = await fetch("/api/me/affiliate/payout-info", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          pix_key: pixForm.pix_key || null,
          pix_key_type: pixForm.pix_key_type || null,
          legal_name: pixForm.legal_name || null,
          tax_id: pixForm.tax_id || null,
        }),
      })
      if (res.ok) {
        setPixSaved(true)
        setTimeout(() => setPixSaved(false), 2500)
        await loadAffiliate()
      }
    } finally {
      setSavingPix(false)
    }
  }

  const totals = aggregates?.totals
  const kpis = useMemo(() => ([
    { label: "Recebido",   value: totals?.received  ?? 0, icon: CreditCard, hint: "Já pago em sua conta" },
    { label: "Disponível", value: totals?.available ?? 0, icon: CheckCircle2, hint: "Liberado · próximo payout" },
    { label: "Em espera",  value: totals?.pending   ?? 0, icon: Hourglass, hint: "Janela de holdback / aprovação" },
    { label: "Revertido",  value: totals?.reversed  ?? 0, icon: RotateCcw, hint: "Reembolso / cancelamento" },
  ]), [totals])

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-black to-neutral-950">
      <main className="container mx-auto px-4 py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Header */}
          <div>
            <Link href="/account" className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/45 hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </Link>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400/25 to-amber-500/15 text-yellow-300 ring-1 ring-white/10">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-white">Meus Faturamentos</h1>
                <p className="text-sm text-white/55">
                  Vendas de cursos, serviços, loja e comissões — tudo em um só lugar.
                </p>
              </div>
              {affiliate && (
                <Badge variant={affiliate.status === "ACTIVE" ? "default" : "secondary"} className="ml-auto">
                  Afiliado · {affiliate.status}
                </Badge>
              )}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {kpis.map((c) => (
              <Card key={c.label} className="border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">{c.label}</p>
                    <c.icon className="h-4 w-4 text-white/40" />
                  </div>
                  <p className="mt-2 text-xl font-semibold text-white tabular-nums">{formatBRL(c.value)}</p>
                  <p className="mt-1 text-[11px] text-white/35">{c.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1.5">
            <TabPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Tudo" active={tab === "all"} onClick={() => setTab("all")} />
            <TabPill icon={<GraduationCap className="h-3.5 w-3.5" />} label="Cursos" active={tab === "course"} onClick={() => setTab("course")} />
            <TabPill icon={<Briefcase className="h-3.5 w-3.5" />} label="Serviços" active={tab === "service"} onClick={() => setTab("service")} />
            <TabPill icon={<Package className="h-3.5 w-3.5" />} label="Produtos" active={tab === "product"} onClick={() => setTab("product")} />
            <TabPill icon={<Users className="h-3.5 w-3.5" />} label="Afiliado" active={tab === "afiliado" || tab === "affiliate"} onClick={() => setTab("afiliado")} />
            <TabPill icon={<Ticket className="h-3.5 w-3.5" />} label="Cupom" active={tab === "cupom"} onClick={() => { setCouponPage(1); setTab("cupom") }} />
          </div>

          {/* Content */}
          <AnimatePresence mode="wait" initial={false}>
            {tab === "cupom" ? (
              <motion.div
                key="cupom"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="space-y-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-yellow-300/70" />
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>
                ) : couponSales.length === 0 ? (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
                    <Ticket className="mx-auto mb-3 h-7 w-7 text-white/35" />
                    <p className="text-sm font-medium text-white/85">Nenhuma venda com seu cupom ainda</p>
                    <p className="mt-1 text-xs text-white/45">Compartilhe seu cupom de afiliado pra começar a ver vendas aqui.</p>
                  </div>
                ) : (
                  <>
                    {couponSales.map((sale) => <CouponSaleRow key={sale.id} sale={sale} />)}
                    {couponTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 pt-3 text-xs text-white/55">
                        <button
                          type="button"
                          disabled={couponPage <= 1}
                          onClick={() => setCouponPage((p) => Math.max(1, p - 1))}
                          className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                        >
                          Anterior
                        </button>
                        <span className="tabular-nums">{couponPage} / {couponTotalPages}</span>
                        <button
                          type="button"
                          disabled={couponPage >= couponTotalPages}
                          onClick={() => setCouponPage((p) => Math.min(couponTotalPages, p + 1))}
                          className="rounded-lg border border-white/10 px-3 py-1.5 transition hover:border-white/30 hover:text-white disabled:opacity-40"
                        >
                          Próxima
                        </button>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            ) : tab === "afiliado" ? (
              <motion.div
                key="afiliado"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="space-y-4"
              >
                <AfiliadoPanel
                  affiliate={affiliate}
                  defaultRule={defaultRule}
                  coupons={coupons}
                  pixForm={pixForm}
                  setPixForm={setPixForm}
                  onSavePix={handleSavePix}
                  savingPix={savingPix}
                  pixSaved={pixSaved}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`list-${tab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ type: "spring", stiffness: 220, damping: 26 }}
                className="space-y-3"
              >
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-yellow-300/70" />
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">{error}</div>
                ) : earnings.length === 0 ? (
                  <EmptyEarnings tab={tab} />
                ) : (
                  earnings.map((e) => <EarningRow key={`${e.kind}-${e.id}`} earning={e} />)
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────── */
/*  Subcomponents                                                      */
/* ──────────────────────────────────────────────────────────────────── */
function TabPill({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gradient-to-r from-yellow-400/20 to-amber-500/10 text-yellow-200"
          : "text-white/55 hover:text-white/85"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function EarningRow({ earning }: { earning: Earning }) {
  const km = KIND_META[earning.kind]
  const sm = STATUS_META[earning.status]
  const Icon = km.icon

  const meta = earning.meta || {}
  const subtitle: string[] = []
  if (typeof meta.buyer_name === "string" && meta.buyer_name) subtitle.push(meta.buyer_name)
  if (typeof meta.client_name === "string" && meta.client_name) subtitle.push(meta.client_name)
  if (typeof meta.coupon_code === "string" && meta.coupon_code) subtitle.push(`Cupom ${meta.coupon_code}`)
  if (typeof meta.quantity === "number" && meta.quantity > 1) subtitle.push(`x${meta.quantity}`)

  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/15"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${km.accent} ring-1 ring-white/10`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-white truncate">{earning.title}</span>
          <Badge className="border-white/15 bg-white/[0.04] text-[10px] text-white/65 h-5 py-0">{km.label}</Badge>
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${sm.color}`}>
            {sm.label}
          </span>
        </div>
        {subtitle.length > 0 && (
          <p className="mt-0.5 text-xs text-white/45 line-clamp-1">{subtitle.join(" · ")}</p>
        )}
        <p className="mt-1 text-[10px] text-white/35">
          {formatDate(earning.created_at)}
          {earning.paid_at && earning.status === "paid" && (
            <> · pago em {formatDate(earning.paid_at)}</>
          )}
          {earning.available_at && earning.status === "pending" && (
            <> · libera em {formatDate(earning.available_at)}</>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-white tabular-nums">{formatBRL(earning.net_cents)}</p>
        {earning.gross_cents !== earning.net_cents && (
          <p className="text-[10px] text-white/35 tabular-nums inline-flex items-center gap-0.5">
            <ArrowDownRight className="h-2.5 w-2.5" />
            de {formatBRL(earning.gross_cents)}
          </p>
        )}
      </div>
    </motion.div>
  )
}

function CouponSaleRow({ sale }: { sale: CouponSale }) {
  const sm = STATUS_META[sale.status] || STATUS_META.pending
  const buyerLabel = sale.buyer.name || sale.buyer.email || "Comprador"
  const itemLabel = sale.item.name
    ? sale.item.count > 1
      ? `${sale.item.name} +${sale.item.count - 1}`
      : sale.item.name
    : `${sale.item.count} item(s)`
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 transition-colors hover:border-white/15"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400/25 to-amber-500/15 text-yellow-300 ring-1 ring-white/10">
        <ShoppingBag className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium text-white">{buyerLabel}</span>
          {sale.coupon_code && (
            <Badge className="border-yellow-400/30 bg-yellow-400/10 text-[10px] text-yellow-200">
              {sale.coupon_code}
            </Badge>
          )}
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${sm.color}`}>
            {sm.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-white/45">{itemLabel}</p>
        <p className="mt-1 text-[10px] text-white/35">
          {formatDate(sale.created_at)}
          {sale.amounts.discount_cents > 0 && (
            <> · desconto {formatBRL(sale.amounts.discount_cents)}</>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold text-white tabular-nums">{formatBRL(sale.amounts.final_cents)}</p>
        <p className="text-[10px] text-emerald-300/85 tabular-nums">+{formatBRL(sale.amounts.commission_cents)}</p>
      </div>
    </motion.div>
  )
}

function EmptyEarnings({ tab }: { tab: Tab }) {
  const txt: Record<Tab, { title: string; hint: string }> = {
    all:       { title: "Nenhum faturamento ainda", hint: "Suas vendas de cursos, serviços, loja e comissões aparecem aqui." },
    course:    { title: "Nenhuma venda de curso",   hint: "Publique um curso e venda pra ver os faturamentos aqui." },
    service:   { title: "Nenhuma venda de serviço", hint: "Faturamentos de bookings pagos aparecem aqui após 8 dias de holdback." },
    product:   { title: "Nenhuma venda da loja",    hint: "Adicione produtos na sua loja e venda pra ver os ganhos." },
    afiliado:  { title: "—", hint: "—" },
    affiliate: { title: "Nenhuma comissão", hint: "Compartilhe seu cupom de afiliado pra gerar conversões." },
    cupom:     { title: "—", hint: "—" },
  }
  const t = txt[tab]
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/40 ring-1 ring-white/10"
      >
        <Wallet className="h-7 w-7" />
      </motion.div>
      <p className="text-sm font-medium text-white/80">{t.title}</p>
      <p className="mt-1 max-w-xs text-xs text-white/40">{t.hint}</p>
    </div>
  )
}

function AfiliadoPanel({
  affiliate, defaultRule, coupons, pixForm, setPixForm, onSavePix, savingPix, pixSaved,
}: {
  affiliate: Affiliate | null
  defaultRule: DefaultRule | null
  coupons: Coupon[]
  pixForm: { pix_key: string; pix_key_type: string; legal_name: string; tax_id: string }
  setPixForm: React.Dispatch<React.SetStateAction<{ pix_key: string; pix_key_type: string; legal_name: string; tax_id: string }>>
  onSavePix: () => void
  savingPix: boolean
  pixSaved: boolean
}) {
  return (
    <>
      {!affiliate && (
        <Card className="border-dashed border-white/15 bg-white/[0.02]">
          <CardContent className="flex gap-3 items-start p-4">
            <Info className="h-4 w-4 text-yellow-300 mt-0.5" />
            <div className="text-sm text-white/65">
              Você ainda não está cadastrado no programa de afiliados. Fale com a equipe Freelandoo
              para ativar sua afiliação e habilitar pagamentos.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cupom */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-white">
            <Ticket className="h-4 w-4" />
            Seu cupom
          </CardTitle>
          <CardDescription>
            Divulgue seu cupom para gerar conversões e acumular comissão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-sm text-white/45">
              Você ainda não tem cupom ativo. Fale com a equipe Freelandoo para gerar o seu.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {coupons.map((c) => (
                <div key={c.id_coupon} className="rounded-xl border border-yellow-400/30 bg-yellow-400/[0.05] px-3 py-2 font-mono text-sm text-yellow-200">
                  {c.code}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regra */}
      {defaultRule && (
        <Card className="border-white/[0.06] bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base text-white">Regra vigente</CardTitle>
            <CardDescription>Aplicada por padrão aos seus cupons.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <Cell label="Comissão" value={`${defaultRule.commission_percent}%`} />
              <Cell label="Base" value={defaultRule.commission_base === "GROSS" ? "Bruto" : "Líquido do desconto"} />
              <Cell label="Pedido mínimo" value={formatBRL(defaultRule.min_order_cents)} />
              <Cell label="Liberação após" value={`${defaultRule.approval_delay_days} dias`} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* PIX */}
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <CardTitle className="text-base text-white">Dados para pagamento</CardTitle>
          <CardDescription>Usaremos estas informações quando gerarmos um lote de pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pix-type" className="text-[11px] uppercase tracking-wider text-white/50">Tipo de chave PIX</Label>
              <Select value={pixForm.pix_key_type} onValueChange={(v) => setPixForm((p) => ({ ...p, pix_key_type: v }))}>
                <SelectTrigger id="pix-type"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                  <SelectItem value="PHONE">Telefone</SelectItem>
                  <SelectItem value="RANDOM">Chave aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pix-key" className="text-[11px] uppercase tracking-wider text-white/50">Chave PIX</Label>
              <Input id="pix-key" placeholder="Sua chave" value={pixForm.pix_key} onChange={(e) => setPixForm((p) => ({ ...p, pix_key: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal-name" className="text-[11px] uppercase tracking-wider text-white/50">Nome / Razão social</Label>
              <Input id="legal-name" value={pixForm.legal_name} onChange={(e) => setPixForm((p) => ({ ...p, legal_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax-id" className="text-[11px] uppercase tracking-wider text-white/50">CPF / CNPJ</Label>
              <Input id="tax-id" value={pixForm.tax_id} onChange={(e) => setPixForm((p) => ({ ...p, tax_id: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={onSavePix}
              disabled={savingPix || !affiliate}
              className="rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:from-yellow-300 hover:to-amber-400"
            >
              {savingPix ? (<><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />Salvando…</>) : (<><Sparkles className="mr-1.5 h-4 w-4" />Salvar</>)}
            </Button>
            {pixSaved && <span className="text-xs text-emerald-400">Dados salvos.</span>}
            {!affiliate && <span className="text-xs text-white/45">Disponível após ativação.</span>}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}
