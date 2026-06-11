"use client"

import { useEffect, useState, memo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import {
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TabloidPageIntro } from "@/components/tabloide"
import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { SellerBalanceSection } from "./_components/seller-balance-section"
import { BookingPayoutsSection } from "./_components/booking-payouts-section"

type TFn = (key: string, fallback?: string) => string

interface Subscription {
  id_subscription: string
  id_user: string
  id_profile: string | null
  profile_name: string | null
  status: "pending" | "active" | "past_due" | "canceled" | "expired" | "failed" | "incomplete"
  amount_cents: number
  currency: string
  stripe_customer_id: string | null
  stripe_checkout_session_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  stripe_promotion_code: string | null
  id_coupon: string | null
  current_period_start: string | null
  current_period_end: string | null
  paid_at: string | null
  canceled_at: string | null
  refunded_at: string | null
  stripe_refund_id: string | null
  stripe_charge_id: string | null
  created_at: string
  updated_at: string
}

interface ManifestationHistory {
  id: string
  name: string
  tag_label: string
  payment_method: "stripe" | "polens"
  amount_cents: number | null
  amount_polens: number | null
  acquired_at: string
  expires_at: string
  is_active: boolean
}

const STATUS_CONFIG = {
  refunded: {
    label: "Reembolsado",
    labelKey: "statusRefundedMale",
    icon: RotateCcw,
    color: "text-rose-600",
    bg: "bg-[#2A2218]/60",
    border: "border-[#2A2218]",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  active: {
    label: "Ativa",
    labelKey: "statusActive",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  pending: {
    label: "Pendente",
    labelKey: "statusPending",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  past_due: {
    label: "Pagamento atrasado",
    labelKey: "statusPastDue",
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
    ring: "ring-orange-500/20",
  },
  canceled: {
    label: "Cancelada",
    labelKey: "statusCanceled",
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  expired: {
    label: "Reembolsada",
    labelKey: "statusRefundedFemale",
    icon: RotateCcw,
    color: "text-rose-600",
    bg: "bg-[#2A2218]/60",
    border: "border-[#2A2218]",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  failed: {
    label: "Falhou",
    labelKey: "statusFailed",
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  incomplete: {
    label: "Incompleta",
    labelKey: "statusIncomplete",
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
} as const

function formatarValor(cents: number, currency = "BRL", locale = "pt-BR") {
  return (cents / 100).toLocaleString(locale, { style: "currency", currency })
}

function formatarDataCurta(d: string, locale = "pt-BR") {
  return new Date(d).toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatarData(d: string, locale = "pt-BR") {
  return new Date(d).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/* ── Bloco com ID copiável ── */
function CopyableId({ label, value, t }: { label: string; value: string; t: TFn }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#2A2218] bg-[#141009]/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-widest text-[#9A938A]">
          {label}
        </p>
        <p className="text-xs font-mono text-[#F5F1E8] truncate select-all" style={{ filter: "none", opacity: 1 }}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={t("copy", "Copiar")}
        className="shrink-0 rounded-md p-1.5 text-[#9A938A] hover:text-[#F5F1E8] hover:bg-[#2A2218] transition-colors"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}

/* ── Pulse dot para status ativa ── */
const PulseDot = memo(function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}
        animate={{ scale: [1, 1.8, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${color}`} />
    </span>
  )
})

function isWithin7Days(dateStr: string | null): boolean {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
}

function refundDeadline(paidAt: string, locale = "pt-BR"): string {
  const d = new Date(new Date(paidAt).getTime() + 7 * 24 * 60 * 60 * 1000)
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
}

/* ── Drawer de reembolso ── */
function RefundDrawer({
  sub,
  onConfirm,
  loading,
  t,
  locale,
}: {
  sub: Subscription
  onConfirm: () => void
  loading: boolean
  t: TFn
  locale: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button className="text-xs text-[#9A938A] hover:text-amber-500 transition-colors underline underline-offset-4 mt-1">
          {t("requestRefund", "Solicitar reembolso")}
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-[#141009] border-t border-[#2A2218] max-h-[50vh] px-6 pt-5 pb-10">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-[#2A2218] mb-6" />
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/50">
              <RotateCcw className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <Drawer.Title className="font-semibold text-base text-[#F5F1E8]">
                {t("refundFullTitle", "Solicitar reembolso integral?")}
              </Drawer.Title>
              <Drawer.Description className="text-sm text-[#9A938A] mt-1">
                {t("refundAmountPrefix", "O valor de")}{" "}
                <span className="font-medium text-[#F5F1E8]">
                  {formatarValor(sub.amount_cents, sub.currency, locale)}
                </span>{" "}
                {t("refundAmountSuffix", "será devolvido ao seu método de pagamento. Seu perfil será desativado imediatamente.")}
              </Drawer.Description>
              <p className="text-xs text-[#9A938A] mt-2">
                {t("refundAvailableNote", "Disponível por 7 dias após o pagamento. Esta ação não pode ser desfeita.")}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-11 border-amber-300 text-amber-800 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950/30"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{t("processing", "Processando...")}</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" />{t("confirmRefund", "Confirmar reembolso")}</>
              )}
            </Button>
            <Button variant="ghost" className="flex-1 h-11" onClick={() => setOpen(false)}>
              {t("cancel", "Cancelar")}
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ── Skeleton loader ── */
function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-[#2A2218] ${className}`} />
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

/* ── Estado vazio ── */
function EmptyState({ onActivate, t }: { onActivate: () => void; t: TFn }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-6 p-5 rounded-2xl bg-[#2A2218]"
      >
        <Sparkles className="h-10 w-10 text-[#9A938A]" />
      </motion.div>
      <h2 className="text-2xl font-semibold tracking-tight text-[#F5F1E8] mb-2">
        {t("emptyTitle", "Nenhuma ativação ativa")}
      </h2>
      <p className="text-[#9A938A] max-w-xs mb-8 text-sm leading-relaxed">
        {t("emptyDescription", "Ative seu perfil para aparecer nas buscas e receber propostas de trabalho.")}
      </p>
      <Button
        onClick={onActivate}
        className="h-11 px-7 gap-2 text-sm font-medium"
      >
        {t("activateProfile", "Ativar perfil")}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </motion.div>
  )
}

/* ── Cartão principal de ativação ── */
function SubscriptionCard({
  sub,
  onRefund,
  refunding,
  isRefunded,
  t,
  locale,
}: {
  sub: Subscription
  onRefund: (id: string) => void
  refunding: string | null
  isRefunded: boolean
  t: TFn
  locale: string
}) {
  const cfg = isRefunded
    ? STATUS_CONFIG.refunded
    : (STATUS_CONFIG[sub.status] ?? STATUS_CONFIG.incomplete)
  const StatusIcon = cfg.icon
  const isPulsing = sub.status === "active" && !isRefunded

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-6 space-y-5 ${isRefunded ? "opacity-60 grayscale" : ""}`}
    >
      {/* Topo */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#9A938A] mb-1">
            {t("profileActivation", "Ativação do perfil")}
          </p>
          <p className="text-3xl font-bold tracking-tight text-[#F5F1E8]">
            {formatarValor(sub.amount_cents, sub.currency, locale)}
            <span className="text-sm font-normal text-[#9A938A] ml-1">{t("oneTime", "único")}</span>
          </p>
          {sub.profile_name && (
            <p className="text-sm text-[#9A938A] mt-0.5">{sub.profile_name}</p>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${isRefunded ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600" : `${cfg.border} ${cfg.bg} ${cfg.color}`}`}
          style={isRefunded ? { filter: "none", opacity: 1 } : undefined}
        >
          {isPulsing ? <PulseDot color={cfg.dot} /> : <StatusIcon className="h-3.5 w-3.5" />}
          {t(cfg.labelKey, cfg.label)}
        </span>
      </div>

      {/* Metadados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-[#9A938A]">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{t("activeSince", "Ativo desde:")} <span className="text-[#F5F1E8] font-medium">{formatarDataCurta(sub.paid_at || sub.created_at, locale)}</span></span>
        </div>

        {sub.id_coupon && (
          <div className="flex items-center gap-2 text-[#9A938A]">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>{t("couponApplied", "Cupom aplicado:")} <span className="text-emerald-600 font-medium">{t("yes", "Sim")}</span></span>
          </div>
        )}

      </div>

      {/* Detalhes do reembolso */}
      {isRefunded && sub.stripe_refund_id && (
        <div className="space-y-2" style={{ filter: "none", opacity: 1 }}>
          <CopyableId label="Stripe Refund ID" value={sub.stripe_refund_id} t={t} />
          {sub.stripe_charge_id && (
            <CopyableId label="Stripe Charge ID" value={sub.stripe_charge_id} t={t} />
          )}
          <p className="text-[11px] text-[#9A938A] leading-relaxed pt-1">
            {t("refundIdsNote", "Use estes IDs em qualquer suporte com a Stripe para rastrear o reembolso. O valor pode levar de 5 a 10 dias úteis para aparecer na fatura.")}
          </p>
        </div>
      )}

      {/* Ações */}
      {sub.status === "active" && !isRefunded && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            {isWithin7Days(sub.paid_at) && (
              <RefundDrawer
                sub={sub}
                onConfirm={() => onRefund(sub.id_subscription)}
                loading={refunding === sub.id_subscription}
                t={t}
                locale={locale}
              />
            )}
          </div>
          {sub.paid_at && isWithin7Days(sub.paid_at) && (
            <p className="text-xs text-[#9A938A]">
              {t("refundAvailableUntil", "Reembolso disponível até")}{" "}
              <span className="font-medium text-[#F5F1E8]">{refundDeadline(sub.paid_at, locale)}</span>
            </p>
          )}
        </div>
      )}

      {sub.status === "pending" && (
        <div className="pt-1">
          <p className="text-xs text-amber-600 mb-2">
            {t("pendingProcessingNote", "Pagamento em processamento. Não concluiu? Finalize abaixo.")}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => window.location.href = "/payment/taxa"}
          >
            {t("finishActivation", "Finalizar ativação")}
          </Button>
        </div>
      )}
    </motion.div>
  )
}

/* ── Histórico de pagamentos ── */
function HistoryTimeline({
  entries,
  selectedId,
  onSelect,
  t,
  locale,
}: {
  entries: Subscription[]
  selectedId: string | null
  onSelect: (id: string) => void
  t: TFn
  locale: string
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[#9A938A] py-6 text-center">
        {t("noConfirmedPayments", "Nenhum pagamento confirmado ainda.")}
      </p>
    )
  }

  return (
    <div className="relative space-y-0">
      {entries.map((s, i) => {
        const isSelected = s.id_subscription === selectedId
        const isRefunded = !!s.refunded_at || s.status === "expired"
        return (
          <motion.button
            key={s.id_subscription}
            type="button"
            onClick={() => onSelect(s.id_subscription)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full flex items-center gap-4 px-3 py-3 -mx-3 rounded-xl border-b border-[#2A2218]/50 last:border-0 text-left transition-colors ${
              isSelected ? "bg-[#2A2218]/60" : "hover:bg-[#2A2218]/30"
            } ${isRefunded ? "opacity-50" : ""}`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${
              isRefunded
                ? "bg-rose-100 dark:bg-rose-950/40"
                : "bg-emerald-100 dark:bg-emerald-950/40"
            }`}>
              {isRefunded ? (
                <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F5F1E8] truncate">
                {s.profile_name || t("profileActivation", "Ativação do perfil")}
              </p>
              <p className="text-xs text-[#9A938A] mt-0.5">
                {formatarData(s.paid_at || s.created_at, locale)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-[#F5F1E8]">
                {formatarValor(s.amount_cents, s.currency, locale)}
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isSelected ? "text-[#F5F1E8] rotate-90" : "text-[#9A938A]"
                }`}
              />
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

/* ── Página principal ── */
export default function PagamentosPage() {
  const router = useRouter()
  const t = useTranslations("Payments")
  const locale = useLocale()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAutenticado, setIsAutenticado] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [manifestationHistory, setManifestationHistory] = useState<ManifestationHistory[]>([])

  useEffect(() => {
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (!token || !user) {
      router.push("/login")
      return
    }

    setIsAutenticado(true)

    const fetchSubscriptions = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/stripe/subscription/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (res.status === 401) { router.push("/login"); return }
          throw new Error(`${t("error", "Erro")} ${res.status}`)
        }
        const data = await res.json()
        setSubscriptions(data.subscriptions || [])
        const manifestationRes = await fetch("/api/manifestations/me", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (manifestationRes.ok) {
          const manifestationData = await manifestationRes.json()
          setManifestationHistory(manifestationData.history || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("loadError", "Erro ao carregar pagamentos."))
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptions()
  }, [router, t])

  const handleRefund = async (id_subscription: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setRefundingId(id_subscription)
    try {
      const res = await fetch("/api/stripe/subscription/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_subscription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t("refundError", "Erro ao processar reembolso"))
      const nowIso = new Date().toISOString()
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id_subscription === id_subscription
            ? {
                ...s,
                refunded_at: nowIso,
                stripe_refund_id: data.refund_id ?? s.stripe_refund_id,
                canceled_at: s.canceled_at ?? nowIso,
              }
            : s
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : t("refundError", "Erro ao processar reembolso"))
    } finally {
      setRefundingId(null)
    }
  }

  const defaultSubscription =
    subscriptions.find((s) => s.status === "active" && !s.refunded_at) ||
    subscriptions.find((s) => s.refunded_at || s.status === "expired") ||
    subscriptions.find((s) => s.status === "pending") ||
    null

  const selectedSubscription =
    subscriptions.find((s) => s.id_subscription === selectedId) || defaultSubscription

  const paidEntries = subscriptions
    .filter((s) => s.paid_at && (s.status === "active" || s.refunded_at || s.status === "expired"))
    .sort((a, b) => {
      const aDate = new Date(a.paid_at || a.created_at).getTime()
      const bDate = new Date(b.paid_at || b.created_at).getTime()
      return bDate - aDate
    })

  if (!isAutenticado) return null

  return (
    <main className="fl-root relative flex-1 bg-[#141009] text-[#F5F1E8]">
      <div className="mx-auto max-w-xl space-y-8 px-4 py-10 md:py-16">

        {/* Header */}
        <TabloidPageIntro
          size="compact"
          eyebrow={t("eyebrow", "Ativação")}
          title={t("title", "PAGAMENTOS.")}
          subtitle={t("subtitle", "Assinaturas, ativações e saldo de vendas em um painel só.")}
        />

        {/* Erro */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800 px-4 py-3 text-sm text-rose-700 dark:text-rose-400"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conteúdo */}
        {isLoading ? (
          <LoadingState />
        ) : subscriptions.length === 0 ? (
          <EmptyState onActivate={() => router.push("/payment/taxa")} t={t} />
        ) : (
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {selectedSubscription && (
                <motion.div
                  key={selectedSubscription.id_subscription}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                >
                  <SubscriptionCard
                    sub={selectedSubscription}
                    onRefund={handleRefund}
                    refunding={refundingId}
                    isRefunded={!!selectedSubscription.refunded_at || selectedSubscription.status === "expired"}
                    t={t}
                    locale={locale}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Histórico */}
            {paidEntries.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-xs font-medium uppercase tracking-widest text-[#9A938A] mb-3">
                  {t("yourActivations", "Suas ativações")}
                </p>
                <HistoryTimeline
                  entries={paidEntries}
                  selectedId={selectedSubscription?.id_subscription || null}
                  t={t}
                  locale={locale}
                  onSelect={(id) => {
                    setSelectedId(id)
                    if (typeof window !== "undefined") {
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                  }}
                />
              </motion.div>
            )}

            {manifestationHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl border border-[#2A2218] bg-[#1D1810] p-5"
              >
                <p className="text-xs font-medium uppercase tracking-widest text-[#9A938A] mb-3">
                  {t("manifestation", "Manifestação")}
                </p>
                <div className="divide-y divide-[#2A2218]/70">
                  {manifestationHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#F5F1E8]">{item.name}</p>
                        <p className="mt-0.5 text-xs text-[#9A938A]">
                          {formatarDataCurta(item.acquired_at, locale)} {t("dateRangeTo", "até")} {formatarDataCurta(item.expires_at, locale)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#F5F1E8]">
                          {item.payment_method === "polens"
                            ? `${Math.abs(item.amount_polens || 0).toLocaleString(locale)} ${t("polens", "Poléns")}`
                            : formatarValor(item.amount_cents || 0, "BRL", locale)}
                        </p>
                        <p className="text-xs text-[#9A938A]">{item.is_active ? t("statusActive", "Ativa") : t("statusEnded", "Encerrada")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {!isLoading && <SellerBalanceSection />}

        {!isLoading && <BookingPayoutsSection />}

      </div>
    </main>
  )
}
