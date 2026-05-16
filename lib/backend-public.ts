/**
 * URL pública do backend, exposta ao cliente.
 *
 * Usar APENAS para uploads grandes (>4.5MB) que estouram o limite de body
 * de funções serverless do Vercel. Para o resto, prefira o proxy `/api/...`
 * (mantém token fora do bundle e centraliza logging).
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
