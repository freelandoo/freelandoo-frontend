// A2 + A3 + A4 (mig 338): chamadas das Vitrines — chaves da pessoa, abas
// Empregos e Dívidas das comunidades, feed nacional de boletos e moderação.
//
// Vão DIRETO no Railway (`getPublicBackendUrl`), nunca pelo proxy `/api/*`:
// o feed e as abas são abertos e relidos várias vezes por sessão, e cada batida
// no proxy vira invocação cobrada na Vercel (regra 6 do CLAUDE.md).

import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"

export type Needs = {
  needs_job: boolean
  needs_job_at: string | null
  job_pitch: string
  needs_debt_help: boolean
  has_cpf: boolean
  adult: boolean
  job_allowed: boolean
  /** Quantas pessoas esta conta já ajudou (boletos confirmados). */
  helped: number
}

export type JobSeeker = {
  id_profile: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
  job_pitch: string | null
  needs_job_at: string | null
  profession: string | null
  city_name: string | null
  uf: string | null
  mine: boolean
}

export type DebtSettings = {
  max_open: number
  max_amount_cents: number
  reserve_minutes: number
  helper_emerald: number
  is_active: boolean
}

export type DebtBill = {
  id_bill: number
  bill_kind: "bank" | "utility"
  amount_cents: number
  due_date: string
  beneficiary: string
  created_at?: string
  status?: "review" | "open" | "claimed" | "paid" | "canceled" | "removed"
  reserved?: boolean
  reserved_by_me?: boolean
  mine?: boolean
  expired?: boolean
  has_proof?: boolean
  removed_reason?: string | null
  reserved_until?: string | null
  /** Linha digitável formatada — só para quem reservou e para o dono. */
  line?: string | null
  line_digits?: string | null
}

export type DebtMine = {
  bills: DebtBill[]
  helping: DebtBill[]
  helped: number
  open_count: number
  settings: DebtSettings
  disclaimer: string
}

export type AdminDebt = DebtBill & {
  id_user: string
  owner_name: string | null
  owner_username: string | null
  reports: { id_report: number; reason: string; created_at: string }[]
}

export class ApiError extends Error {
  status: number
  reason?: string
  constructor(message: string, status: number, reason?: string) {
    super(message)
    this.status = status
    this.reason = reason
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    payload = JSON.stringify(body)
  }
  const res = await fetch(`${getPublicBackendUrl()}${path}`, { method, headers, body: payload })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data?.error || data?.message || `Erro ${res.status}`, res.status, data?.reason)
  return data as T
}

export const vitrinesApi = {
  needs: () => call<{ needs: Needs }>("GET", "/me/needs"),
  updateNeeds: (patch: Partial<Pick<Needs, "needs_job" | "job_pitch" | "needs_debt_help">>) =>
    call<{ needs: Needs }>("PUT", "/me/needs", patch),

  communityJobs: (id: string, offset = 0) =>
    call<{ people: JobSeeker[]; scope: "participants" | "national" }>("GET", `/communities/${id}/jobs?limit=30&offset=${offset}`),
  communityDebts: (id: string, offset = 0) =>
    call<{ bills: DebtBill[]; scope: "participants" | "national"; disclaimer: string }>(
      "GET",
      `/communities/${id}/debts?limit=30&offset=${offset}`
    ),

  debtSettings: () => call<{ settings: DebtSettings; disclaimer: string }>("GET", "/debts/settings"),
  debtFeed: (offset = 0) => call<{ bills: DebtBill[]; disclaimer: string }>("GET", `/debts?limit=30&offset=${offset}`),
  debtMine: () => call<DebtMine>("GET", "/debts/mine"),
  debtCreate: (body: { line: string; beneficiary: string; due_date?: string }) =>
    call<{ bill: DebtBill; needs_review: boolean }>("POST", "/debts", body),
  debtCancel: (id: number) => call<{ ok: true }>("POST", `/debts/${id}/cancel`),
  debtReserve: (id: number) => call<{ bill: DebtBill; reserve_minutes: number }>("POST", `/debts/${id}/reserve`),
  debtRelease: (id: number) => call<{ ok: true }>("DELETE", `/debts/${id}/reserve`),
  debtProof: (id: number, file: File) => {
    const fd = new FormData()
    fd.append("file", file)
    return call<{ bill: DebtBill }>("POST", `/debts/${id}/proof`, fd)
  },
  debtProofUrl: (id: number) => call<{ url: string }>("GET", `/debts/${id}/proof-url`),
  debtConfirm: (id: number) => call<{ ok: true; emerald: number }>("POST", `/debts/${id}/confirm`),
  debtRejectProof: (id: number) => call<{ ok: true }>("POST", `/debts/${id}/reject-proof`),
  debtReport: (id: number, reason: string) => call<{ ok: true }>("POST", `/debts/${id}/report`, { reason }),

  adminQueue: () => call<{ items: AdminDebt[] }>("GET", "/admin/debts/queue"),
  adminSettings: () => call<{ settings: DebtSettings }>("GET", "/admin/debts/settings"),
  adminUpdateSettings: (patch: Partial<DebtSettings>) => call<{ settings: DebtSettings }>("PUT", "/admin/debts/settings", patch),
  adminReview: (id: number, body: { approve: boolean; beneficiary?: string; reason?: string }) =>
    call<{ bill: DebtBill }>("POST", `/admin/debts/${id}/review`, body),
  adminRemove: (id: number, reason: string) => call<{ ok: true }>("POST", `/admin/debts/${id}/remove`, { reason }),
  adminResolveReports: (id: number) => call<{ resolved: number }>("POST", `/admin/debts/${id}/resolve-reports`),
  adminProofUrl: (id: number) => call<{ url: string }>("GET", `/admin/debts/${id}/proof-url`),
}
