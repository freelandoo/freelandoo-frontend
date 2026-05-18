export class FetchTimeoutError extends Error {
  constructor(message = "Fetch timed out") {
    super(message)
    this.name = "FetchTimeoutError"
  }
}

/**
 * fetch com timeout BULLETPROOF.
 *
 * Por que não confiar só em AbortController: em alguns cenários do runtime
 * Node + Vercel, o socket TCP keep-alive não respeita o abort signal,
 * resultando em funções penduradas até o teto de 15min (Time to First Byte
 * = 15min mesmo com timeout configurado de 4s).
 *
 * Solução: Promise.race entre o fetch e um setTimeout independente. Se o
 * fetch não voltar no tempo limite, a Promise.race resolve com erro e a
 * função pode RETORNAR mesmo que o socket continue vivo em background
 * (será coletado pelo GC ou morto pelo runtime no fim da invocação).
 *
 * Combina também AbortController pra tentar fechar a conexão (melhor esforço).
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<Response> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      try { controller.abort() } catch { /* ignore */ }
      reject(new FetchTimeoutError(`Fetch timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  const fetchPromise = fetch(input, {
    ...init,
    signal: init.signal ?? controller.signal,
  }).catch((error) => {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new FetchTimeoutError(`Fetch aborted after ${timeoutMs}ms`)
    }
    throw error
  })

  try {
    return await Promise.race([fetchPromise, timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Lê body com timeout. Mesmo padrão de Promise.race.
 */
export async function readBodyWithTimeout(
  response: Response,
  timeoutMs = 3500
): Promise<string> {
  if (!response.body) return ""

  let timer: ReturnType<typeof setTimeout> | null = null
  let aborted = false

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      aborted = true
      try { response.body?.cancel().catch(() => {}) } catch { /* ignore */ }
      reject(new FetchTimeoutError(`Body read timed out after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  const readPromise = (async () => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let result = ""
    while (true) {
      if (aborted) break
      const { done, value } = await reader.read()
      if (done) break
      result += decoder.decode(value, { stream: true })
    }
    result += decoder.decode()
    return result
  })()

  try {
    return await Promise.race([readPromise, timeoutPromise])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** Helper combinado: fetch + parse JSON com timeout total. */
export async function fetchJsonWithTimeout<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const requestBudget = Math.max(1000, Math.floor(timeoutMs * 0.6))
  const bodyBudget = Math.max(500, timeoutMs - requestBudget)

  const response = await fetchWithTimeout(input, init, requestBudget)
  let data: T | null = null
  try {
    const text = await readBodyWithTimeout(response, bodyBudget)
    if (text) {
      try { data = JSON.parse(text) as T } catch { data = null }
    }
  } catch {
    data = null
  }
  return { ok: response.ok, status: response.status, data }
}

export function isFetchTimeout(error: unknown): boolean {
  return error instanceof FetchTimeoutError
}
