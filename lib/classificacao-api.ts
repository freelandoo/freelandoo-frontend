// A6 CLASSIFICAÇÃO (migs 395/396): a prova (nota 0–100 pela TRI), quem vê a
// nota e o perfil de personalidade (Big Five/IPIP-50, privado e com
// consentimento). Direto no Railway (regra 6): a prova faz 20 idas e voltas.

import { getToken } from "@/lib/auth"
import { getPublicBackendUrl } from "@/lib/backend-public"

export type Visibility = "private" | "link" | "profile"
export type AreaSummary = Record<string, { n: number; ok: number }>

export type ClassResult = {
  score: number
  finished_at: string
  visibility: Visibility
  share_token: string | null
  areas: AreaSummary | null
}

export type Attempt = {
  id_attempt: number
  status: "open" | "done" | "expired"
  started_at: string
  expires_at: string
  answered: number
  total: number
  item: { id: number; area: string; stem: string; options: string[]; attribution: string | null } | null
  score: number | null
  areas: AreaSummary | null
}

export type ClassMe = {
  result: ClassResult | null
  open: Attempt | null
  next_at: string | null
  retake_days: number
  test_length: number
  minutes: number
  personality: { consent: boolean; consent_version: string; has_profile: boolean }
}

export type Traits = Record<"extraversion" | "agreeableness" | "conscientiousness" | "stability" | "openness", number>

export class ClassError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function call<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = {}
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers["Content-Type"] = "application/json"
  const res = await fetch(`${getPublicBackendUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ClassError(data?.error || `Erro ${res.status}`, res.status)
  return data as T
}

export const classApi = {
  me: () => call<ClassMe>("GET", "/classificacao/me"),
  start: (locale: string) => call<{ attempt: Attempt }>("POST", "/classificacao/attempts", { locale }),
  answer: (id: number, item_id: number, choice: number) =>
    call<{ attempt: Attempt }>("POST", `/classificacao/attempts/${id}/answer`, { item_id, choice }),
  visibility: (visibility: Visibility) => call<{ result: ClassResult }>("PUT", "/classificacao/me/visibility", { visibility }),
  personality: () =>
    call<{ consent: boolean; consent_version: string; profile: { traits: Traits; updated_at: string } | null }>("GET", "/classificacao/personality"),
  consent: (version: string) => call<{ consent: true }>("POST", "/classificacao/personality/consent", { version }),
  savePersonality: (answers: number[]) => call<{ profile: { traits: Traits } }>("PUT", "/classificacao/personality", { answers }),
  deletePersonality: () => call<{ deleted: boolean }>("DELETE", "/classificacao/personality"),
  publicByToken: (token: string) =>
    call<{ score: number; finished_at: string; name: string | null; username: string | null; avatar: string | null }>(
      "GET",
      `/public/classificacao/link/${encodeURIComponent(token)}`,
      undefined,
      false
    ),
  publicByUsername: (username: string) =>
    call<{ score: number; finished_at: string }>("GET", `/public/classificacao/user/${encodeURIComponent(username)}`, undefined, false),
}
