"use client"

import { useEffect, useState, memo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Drawer } from "vaul"
import {
  CreditCard,
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
import { SellerBalanceSection } from "./_components/seller-balance-section"
import { BookingPayoutsSection } from "./_components/booking-payouts-section"

interface Subscription {
  id_subscription: string
  id_user: string
  id_profile: string | null
  profile_name: string | null
  status: "pending" | "active" | "past_due" | "canceled" | "incomplete"
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
    icon: RotateCcw,
    color: "text-rose-600",
    bg: "bg-muted/60",
    border: "border-border",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  active: {
    label: "Ativa",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
  },
  past_due: {
    label: "Pagamento atrasado",
    icon: AlertTriangle,
    color: "text-orange-600",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
    ring: "ring-orange-500/20",
  },
  canceled: {
    label: "Cancelada",
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
  incomplete: {
    label: "Incompleta",
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-400",
    ring: "ring-rose-500/20",
  },
} as const

function formatarValor(cents: number, currency = "BRL") {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency })
}

function formatarDataCurta(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatarData(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getPeriodProgress(start: string, end: string): number {
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  const now = Date.now()
  return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100))
}

function getDaysRemaining(end: string): number {
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000))
}

/* ── Bloco com ID copiável ── */
function CopyableId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/40 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-xs font-mono text-foreground truncate select-all" style={{ filter: "none", opacity: 1 }}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar"
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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

/* ── Barra de progresso do período ── */
const PeriodBar = memo(function PeriodBar({
  start,
  end,
}: {
  start: string
  end: string
}) {
  const pct = getPeriodProgress(start, end)
  const days = getDaysRemaining(end)

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatarDataCurta(start)}</span>
        <span className="font-medium text-foreground">{days}d restantes</span>
        <span>{formatarDataCurta(end)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-foreground"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
})

function isWithin7Days(dateStr: string | null): boolean {
  if (!dateStr) return false
  return Date.now() - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000
}

function refundDeadline(paidAt: string): string {
  const d = new Date(new Date(paidAt).getTime() + 7 * 24 * 60 * 60 * 1000)
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

/* ── Drawer de reembolso ── */
function RefundDrawer({
  sub,
  onConfirm,
  loading,
}: {
  sub: Subscription
  onConfirm: () => void
  loading: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button className="text-xs text-muted-foreground hover:text-amber-500 transition-colors underline underline-offset-4 mt-1">
          Solicitar reembolso
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-background border-t border-border max-h-[50vh] px-6 pt-5 pb-10">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-6" />
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/50">
              <RotateCcw className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <Drawer.Title className="font-semibold text-base text-foreground">
                Solicitar reembolso integral?
              </Drawer.Title>
              <Drawer.Description className="text-sm text-muted-foreground mt-1">
                O valor de{" "}
                <span className="font-medium text-foreground">
                  {formatarValor(sub.amount_cents, sub.currency)}
                </span>{" "}
                será devolvido ao seu método de pagamento. Seu perfil será desativado imediatamente.
              </Drawer.Description>
              <p className="text-xs text-muted-foreground mt-2">
                Disponível por 7 dias após o pagamento. Esta ação não pode ser desfeita.
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
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processando...</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" />Confirmar reembolso</>
              )}
            </Button>
            <Button variant="ghost" className="flex-1 h-11" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

/* ── Drawer de cancelamento ── */
function CancelDrawer({
  sub,
  onConfirm,
  loading,
}: {
  sub: Subscription
  onConfirm: () => void
  loading: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button className="text-xs text-muted-foreground hover:text-rose-500 transition-colors underline underline-offset-4 mt-1">
          Cancelar renovação automática
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-background border-t border-border max-h-[45vh] px-6 pt-5 pb-10">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-6" />
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <Drawer.Title className="font-semibold text-base text-foreground">
                Cancelar renovação automática?
              </Drawer.Title>
              <Drawer.Description className="text-sm text-muted-foreground mt-1">
                Seu perfil continua ativo até{" "}
                <span className="font-medium text-foreground">
                  {sub.current_period_end
                    ? formatarDataCurta(sub.current_period_end)
                    : "o fim do período"}
                </span>
                . Não haverá reembolso.
              </Drawer.Description>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              className="flex-1 h-11"
              disabled={loading}
              onClick={onConfirm}
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Cancelando...</>
              ) : (
                "Sim, cancelar"
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setOpen(false)}
            >
              Manter assinatura
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
    <div className={`animate-pulse rounded-lg bg-muted ${className}`} />
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
function EmptyState({ onActivate }: { onActivate: () => void }) {
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
        className="mb-6 p-5 rounded-2xl bg-muted"
      >
        <Sparkles className="h-10 w-10 text-muted-foreground" />
      </motion.div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2">
        Nenhuma assinatura ativa
      </h2>
      <p className="text-muted-foreground max-w-xs mb-8 text-sm leading-relaxed">
        Ative sua anuidade para aparecer nas buscas e receber propostas de trabalho.
      </p>
      <Button
        onClick={onActivate}
        className="h-11 px-7 gap-2 text-sm font-medium"
      >
        Ativar anuidade
        <ChevronRight className="h-4 w-4" />
      </Button>
    </motion.div>
  )
}

/* ── Cartão principal de assinatura ── */
function SubscriptionCard({
  sub,
  onCancel,
  cancelling,
  onRefund,
  refunding,
  isRefunded,
}: {
  sub: Subscription
  onCancel: (id: string) => void
  cancelling: string | null
  onRefund: (id: string) => void
  refunding: string | null
  isRefunded: boolean
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
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
            Anuidade Freelandoo
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {formatarValor(sub.amount_cents, sub.currency)}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ano</span>
          </p>
          {sub.profile_name && (
            <p className="text-sm text-muted-foreground mt-0.5">{sub.profile_name}</p>
          )}
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${isRefunded ? "border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600" : `${cfg.border} ${cfg.bg} ${cfg.color}`}`}
          style={isRefunded ? { filter: "none", opacity: 1 } : undefined}
        >
          {isPulsing ? <PulseDot color={cfg.dot} /> : <StatusIcon className="h-3.5 w-3.5" />}
          {cfg.label}
        </span>
      </div>

      {/* Barra de progresso do período */}
      {sub.current_period_start && sub.current_period_end && sub.status === "active" && (
        <PeriodBar start={sub.current_period_start} end={sub.current_period_end} />
      )}

      {/* Metadados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Adesão: <span className="text-foreground font-medium">{formatarDataCurta(sub.created_at)}</span></span>
        </div>

        {sub.id_coupon && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Cupom aplicado: <span className="text-emerald-600 font-medium">Sim</span></span>
          </div>
        )}

        {sub.canceled_at && sub.status === "active" && (
          <div className="flex items-center gap-2 col-span-full text-amber-600 text-xs font-medium">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            Cancelamento agendado — ativo até {formatarDataCurta(sub.canceled_at)}
          </div>
        )}
      </div>

      {/* Detalhes do reembolso */}
      {isRefunded && sub.stripe_refund_id && (
        <div className="space-y-2" style={{ filter: "none", opacity: 1 }}>
          <CopyableId label="Stripe Refund ID" value={sub.stripe_refund_id} />
          {sub.stripe_charge_id && (
            <CopyableId label="Stripe Charge ID" value={sub.stripe_charge_id} />
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
            Use estes IDs em qualquer suporte com a Stripe para rastrear o reembolso.
            O valor pode levar de 5 a 10 dias úteis para aparecer na fatura.
          </p>
        </div>
      )}

      {/* Ações */}
      {sub.status === "active" && !sub.canceled_at && !isRefunded && (
        <div className="space-y-2 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <CancelDrawer
              sub={sub}
              onConfirm={() => onCancel(sub.id_subscription)}
              loading={cancelling === sub.id_subscription}
            />
            {isWithin7Days(sub.paid_at) && (
              <RefundDrawer
                sub={sub}
                onConfirm={() => onRefund(sub.id_subscription)}
                loading={refunding === sub.id_subscription}
              />
            )}
          </div>
          {sub.paid_at && isWithin7Days(sub.paid_at) && (
            <p className="text-xs text-muted-foreground">
              Reembolso disponível até{" "}
              <span className="font-medium text-foreground">{refundDeadline(sub.paid_at)}</span>
            </p>
          )}
        </div>
      )}

      {sub.status === "pending" && (
        <div className="pt-1">
          <p className="text-xs text-amber-600 mb-2">
            Pagamento em processamento. Não concluiu? Finalize abaixo.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => window.location.href = "/payment/taxa"}
          >
            Finalizar pagamento
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
}: {
  entries: Subscription[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Nenhum pagamento confirmado ainda.
      </p>
    )
  }

  return (
    <div className="relative space-y-0">
      {entries.map((s, i) => {
        const isSelected = s.id_subscription === selectedId
        const isRefunded = !!s.refunded_at
        return (
          <motion.button
            key={s.id_subscription}
            type="button"
            onClick={() => onSelect(s.id_subscription)}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full flex items-center gap-4 px-3 py-3 -mx-3 rounded-xl border-b border-border/50 last:border-0 text-left transition-colors ${
              isSelected ? "bg-muted/60" : "hover:bg-muted/30"
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
              <p className="text-sm font-medium text-foreground truncate">
                {s.profile_name || "Anuidade Freelandoo"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatarData(s.paid_at || s.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-foreground">
                {formatarValor(s.amount_cents, s.currency)}
              </span>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isSelected ? "text-foreground rotate-90" : "text-muted-foreground"
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isAutenticado, setIsAutenticado] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
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
          throw new Error(`Erro ${res.status}`)
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
        setError(err instanceof Error ? err.message : "Erro ao carregar assinatura.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSubscriptions()
  }, [router])

  const handleCancel = async (id_subscription: string) => {
    const token = localStorage.getItem("token")
    if (!token) return
    setCancellingId(id_subscription)
    try {
      const res = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id_subscription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao cancelar")
      setSubscriptions((prev) =>
        prev.map((s) =>
          s.id_subscription === id_subscription ? { ...s, canceled_at: data.cancel_at } : s
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar assinatura")
    } finally {
      setCancellingId(null)
    }
  }

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
      if (!res.ok) throw new Error(data.error || "Erro ao processar reembolso")
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
      setError(err instanceof Error ? err.message : "Erro ao processar reembolso")
    } finally {
      setRefundingId(null)
    }
  }

  const defaultSubscription =
    subscriptions.find((s) => (s.status === "active" || s.status === "past_due") && !s.refunded_at) ||
    subscriptions.find((s) => s.refunded_at) ||
    subscriptions.find((s) => s.status === "pending") ||
    null

  const selectedSubscription =
    subscriptions.find((s) => s.id_subscription === selectedId) || defaultSubscription

  const paidEntries = subscriptions
    .filter((s) => s.paid_at && (s.status === "active" || s.refunded_at))
    .sort((a, b) => {
      const aDate = new Date(a.paid_at || a.created_at).getTime()
      const bDate = new Date(b.paid_at || b.created_at).getTime()
      return bDate - aDate
    })

  if (!isAutenticado) return null

  return (
    <main className="flex-1 container mx-auto px-4 py-10 md:py-16">
      <div className="max-w-xl mx-auto space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Assinatura
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tighter leading-none text-foreground">
            Meus Pagamentos
          </h1>
        </motion.div>

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
          <EmptyState onActivate={() => router.push("/payment/taxa")} />
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
                    onCancel={handleCancel}
                    cancelling={cancellingId}
                    onRefund={handleRefund}
                    refunding={refundingId}
                    isRefunded={!!selectedSubscription.refunded_at}
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
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Suas assinaturas
                </p>
                <HistoryTimeline
                  entries={paidEntries}
                  selectedId={selectedSubscription?.id_subscription || null}
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
                className="rounded-2xl border border-border bg-card p-5"
              >
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
                  Manifestacao
                </p>
                <div className="divide-y divide-border/70">
                  {manifestationHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatarDataCurta(item.acquired_at)} ate {formatarDataCurta(item.expires_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {item.payment_method === "polens"
                            ? `${Math.abs(item.amount_polens || 0).toLocaleString("pt-BR")} Polens`
                            : formatarValor(item.amount_cents || 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.is_active ? "Ativa" : "Encerrada"}</p>
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
