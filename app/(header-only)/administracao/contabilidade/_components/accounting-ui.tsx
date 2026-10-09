"use client"

/**
 * Vocabulário compartilhado do painel de Contabilidade (mig 277): tipos,
 * chamadas ao backend, formatação e o modal. Admin = pt-only, cantos retos.
 */
import type { ReactNode } from "react"
import { X } from "lucide-react"
import { getPublicBackendUrl } from "@/lib/backend-public"

// ─── tipos ───────────────────────────────────────────────────────────────────
export type Regime = "mei" | "simples" | "presumido" | "real"

export interface Company {
  id_company: string
  name: string
  cnpj: string | null
  regime: Regime
  simples_anexo: string | null
  municipio: string | null
  uf: string | null
  notes: string | null
  overdue_count?: number
}

export interface LateCharges {
  days_late: number
  fine_rate: number
  interest_rate: number
  fine_cents: number
  interest_cents: number
  total_cents: number
  principal_cents: number
  estimated: boolean
}

export interface Obligation {
  id_obligation: string
  kind: "payment" | "declaration"
  name: string
  sphere: "federal" | "estadual" | "municipal"
  competence: string | null
  due_date: string
  amount_cents: number | null
  status: "pending" | "paid" | "filed" | "canceled"
  paid_at: string | null
  paid_amount_cents: number | null
  receipt_key: string | null
  notes: string | null
  source: "manual" | "generated"
  overdue?: boolean
  late_charges?: LateCharges
}

export type EntryType = "revenue" | "other_in" | "expense" | "prolabore" | "payroll" | "tax" | "other_out"

export interface Entry {
  id_entry: string
  entry_date: string
  entry_type: EntryType
  amount_cents: number
  description: string
  counterparty: string | null
  document_ref: string | null
  id_obligation: string | null
}

// ─── rótulos ─────────────────────────────────────────────────────────────────
export const REGIME_LABEL: Record<Regime, string> = {
  mei: "MEI",
  simples: "Simples Nacional",
  presumido: "Lucro Presumido",
  real: "Lucro Real",
}

export const ANEXO_OPTIONS = [
  { value: "I", label: "Anexo I — comércio" },
  { value: "II", label: "Anexo II — indústria" },
  { value: "III", label: "Anexo III — serviços" },
  { value: "IV", label: "Anexo IV — serviços (obra, limpeza, advocacia)" },
  { value: "V", label: "Anexo V — serviços intelectuais" },
  { value: "III_V", label: "III ou V pelo Fator R" },
]

export const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  revenue: "Faturamento",
  other_in: "Outra entrada",
  expense: "Despesa",
  prolabore: "Pró-labore",
  payroll: "Salário / encargos",
  tax: "Imposto pago",
  other_out: "Outra saída",
}

export const IN_TYPES = new Set<EntryType>(["revenue", "other_in"])

export const STATUS_LABEL: Record<Obligation["status"], string> = {
  pending: "Pendente",
  paid: "Paga",
  filed: "Entregue",
  canceled: "Cancelada",
}

export const SPHERE_LABEL: Record<Obligation["sphere"], string> = {
  federal: "Federal",
  estadual: "Estadual",
  municipal: "Municipal",
}

// ─── formatação ──────────────────────────────────────────────────────────────
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
export const brl = (cents: number | null | undefined) => (cents == null ? "—" : BRL.format(cents / 100))
export const pct = (v: number) => `${(v * 100).toFixed(2).replace(".", ",")}%`

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

export function fmtMonth(iso: string | null | undefined) {
  if (!iso) return "—"
  const [y, m] = iso.slice(0, 7).split("-")
  return `${m}/${y}`
}

/** Centavos → "236,35" para pré-preencher um campo de valor. */
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",")

export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
}

export function formatCnpj(cnpj: string | null) {
  if (!cnpj || cnpj.length !== 14) return cnpj || ""
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`
}

// ─── chamadas ────────────────────────────────────────────────────────────────
function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null
}

/** JSON pelo proxy `/api/admin/accounting/*`. Lança Error com a fala do backend. */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api/admin/accounting/${path}`, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Erro ${res.status}`)
  return data as T
}

/**
 * O comprovante vai DIRETO no Railway: o proxy só sabe JSON, e um corpo que
 * atravessa a Vercel morre em ~4,5MB.
 */
export async function uploadReceipt(companyId: string, obligationId: string, file: File) {
  const fd = new FormData()
  fd.append("file", file)
  const res = await fetch(
    `${getPublicBackendUrl()}/admin/accounting/companies/${companyId}/obligations/${obligationId}/receipt`,
    { method: "POST", headers: { Authorization: `Bearer ${token()}` }, body: fd },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`)
  return data as { obligation: Obligation }
}

// ─── peças ───────────────────────────────────────────────────────────────────
export const INPUT =
  "w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
export const BTN_PRIMARY =
  "inline-flex items-center gap-2 border border-primary/50 bg-primary/15 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/25 disabled:opacity-50"
export const BTN_GHOST =
  "inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      className="fl-sharp fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-16"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-lg border border-border bg-card p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warn" | "error"; children: ReactNode }) {
  const cls =
    tone === "error"
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : tone === "warn"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : "border-sky-500/30 bg-sky-500/10 text-sky-200"
  return <div className={`border px-3 py-2 text-sm ${cls}`}>{children}</div>
}
