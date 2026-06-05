const isDev = process.env.NODE_ENV === "development"
const MAX_LOG_LEN = 200

// Verbosidade de logs por-request. Cada `console.*` numa função serverless do
// Vercel é ingerido como 1 Observability Event (cobrado). O tripé
// start/backend-fetch/end multiplicava ~3x as invocações em eventos de log.
// Em produção logamos APENAS erros/non-2xx; o trace completo fica em dev ou
// sob API_VERBOSE_LOGS=1 (debug pontual). Isso derruba a linha "Observability
// Events" da fatura sem perder visibilidade de falhas.
const VERBOSE = isDev || process.env.API_VERBOSE_LOGS === "1"

/** Path da requisição de entrada, sem query string (evita tokens na URL em logs). */
export function apiRequestPath(request: Request | undefined): string {
  if (!request) return ""
  try {
    return new URL(request.url).pathname
  } catch {
    return ""
  }
}

/** Caminho relativo do backend a partir da URL completa (sem host). */
export function apiBackendPath(fullUrl: string): string {
  try {
    return new URL(fullUrl).pathname + new URL(fullUrl).search
  } catch {
    return fullUrl.length > 120 ? `${fullUrl.slice(0, 120)}…` : fullUrl
  }
}

function scrubMeta(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {}
  const out: Record<string, unknown> = { ...meta }
  for (const k of Object.keys(out)) {
    if (/auth|token|password|authorization|secret|cookie/i.test(k)) {
      out[k] = "[redacted]"
    }
  }
  return out
}

/** Logs detalhados apenas em desenvolvimento (nunca envie corpos com PII em produção). */
export function apiDebug(label: string, ...args: unknown[]) {
  if (!isDev) return
  console.log(`[api:${label}]`, ...args)
}

/**
 * Linha estruturada de trace (start/backend-fetch/end). Silenciada em produção
 * por padrão para não gerar Observability Events no Vercel — ligue com
 * API_VERBOSE_LOGS=1 quando precisar depurar. Erros usam apiWarn/apiError,
 * que NÃO são silenciados.
 */
export function apiInfo(label: string, phase: string, meta?: Record<string, unknown>) {
  if (!VERBOSE) return
  const extra = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(scrubMeta(meta))}` : ""
  console.info(`[api:${label}]`, `${phase}${extra}`)
}

export function apiWarn(label: string, phase: string, meta?: Record<string, unknown>) {
  const extra = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(scrubMeta(meta))}` : ""
  console.warn(`[api:${label}]`, `${phase}${extra}`)
}

export function apiError(label: string, error: unknown) {
  let message = error instanceof Error ? error.message : String(error)
  if (!isDev && message.length > MAX_LOG_LEN) {
    message = `${message.slice(0, MAX_LOG_LEN)}…`
  }
  console.error(`[api:${label}]`, message)
}

/**
 * Rastreia uma rota API: início, chamadas ao backend e término com status HTTP.
 * Use `let status = 500`, atualize antes de cada `return`, e chame `log.end(status)` em `finally`,
 * ou use o retorno de `log.endWith(res)` no lugar de `return res`.
 */
export function apiFlow(label: string) {
  const t0 = Date.now()
  const flow = {
    start(request?: Request, meta?: Record<string, unknown>) {
      apiInfo(label, "start", {
        method: request?.method ?? (meta?.method as string) ?? "?",
        path: request ? apiRequestPath(request) : (meta?.path as string) ?? "",
        ...scrubMeta(meta),
      })
    },

    backendFetch(method: string, upstreamUrl: string, httpStatus: number) {
      apiInfo(label, "backend-fetch", {
        method,
        upstream: apiBackendPath(upstreamUrl),
        status: httpStatus,
      })
    },

    /** Chame no `finally` com o status HTTP da resposta enviada ao cliente. */
    end(httpStatus: number, meta?: Record<string, unknown>) {
      apiInfo(label, "end", {
        status: httpStatus,
        ms: Date.now() - t0,
        ...scrubMeta(meta),
      })
      if (httpStatus >= 400) {
        apiWarn(label, "non-2xx", { status: httpStatus })
      }
    },

    /** Erro não tratado ou exceção antes de montar a Response. */
    fail(error: unknown, meta?: Record<string, unknown>) {
      apiError(label, error)
      apiInfo(label, "fail", { ms: Date.now() - t0, ...scrubMeta(meta) })
    },

    endWith(response: Response, meta?: Record<string, unknown>): Response {
      flow.end(response.status, meta)
      return response
    },
  }
  return flow
}
