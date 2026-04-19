import { apiDebug } from "@/lib/api-logger"

const DEFAULT_BACKEND_API_URL = "https://freelandoo-backend-production.up.railway.app"

let loggedBackendOrigin = false

/**
 * URL base da API backend (sem barra final).
 * Defina `BACKEND_API_URL` no ambiente para staging/produção alternativos.
 */
export function getBackendApiUrl(): string {
  const raw = process.env.BACKEND_API_URL?.trim()
  const base = raw && raw.length > 0 ? raw : DEFAULT_BACKEND_API_URL
  const normalized = base.replace(/\/$/, "")

  if (!loggedBackendOrigin) {
    loggedBackendOrigin = true
    const source = raw && raw.length > 0 ? "BACKEND_API_URL" : "default"
    apiDebug("backend", "resolved base URL", { source, host: safeHost(normalized) })
  }

  return normalized
}

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return "invalid"
  }
}
