/**
 * URL pública do backend, exposta ao cliente.
 *
 * Usar para: (a) uploads grandes (>4.5MB) que estouram o limite de body de
 * funções serverless do Vercel; (b) chamadas de ALTA FREQUÊNCIA do browser
 * (heartbeats, polls, chat ao vivo) — cada hit no proxy `/api/...` cobra
 * invocação/edge request na Vercel, e direto no Railway custa zero extra.
 * Para chamadas esporádicas, o proxy `/api/...` segue ok (centraliza logging).
 *
 * Define-se via `NEXT_PUBLIC_BACKEND_URL`. CORS no backend já aceita
 * *.vercel.app, freelandoo.com.br e localhost.
 */
const DEFAULT_BACKEND_PUBLIC_URL = "https://freelandoo-backend-production.up.railway.app"

export function getPublicBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()
  const base = raw && raw.length > 0 ? raw : DEFAULT_BACKEND_PUBLIC_URL
  return base.replace(/\/$/, "")
}
