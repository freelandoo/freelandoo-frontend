export class FetchTimeoutError extends Error {
  constructor(message = "Fetch timed out") {
    super(message)
    this.name = "FetchTimeoutError"
  }
}

/**
 * fetch que aborta tanto o request quanto a leitura do body.
 *
 * Antes só abortava o headers — se o backend retornava status code mas
 * trickle bytes do body, `await response.text()` ficava preso sem timeout
 * e a Vercel function pendurava até o teto de 15min. Agora o controller
 * é mantido vivo e o caller pode chamar `readBodyWithTimeout` pra cancelar
 * a leitura também.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new FetchTimeoutError(`Fetch timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Lê body de uma Response com timeout. Se o backend trickle bytes o read
 * é abortado e a function devolve resposta de fallback em vez de pendurar.
 */
export async function readBodyWithTimeout(
  response: Response,
  timeoutMs = 3500
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    if (!response.body) return ""
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ""

    const readChunk = async (): Promise<void> => {
      while (true) {
        if (controller.signal.aborted) {
          throw new FetchTimeoutError(`Body read timed out after ${timeoutMs}ms`)
        }
        const { done, value } = await reader.read()
        if (done) return
        result += decoder.decode(value, { stream: true })
      }
    }

    const racePromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        try { reader.cancel().catch(() => {}) } catch {}
        reject(new FetchTimeoutError(`Body read timed out after ${timeoutMs}ms`))
      })
    })

    await Promise.race([readChunk(), racePromise])
    result += decoder.decode()
    return result
  } finally {
    clearTimeout(timer)
  }
}

/** Helper combinado: fetch + parse JSON com timeout total. */
export async function fetchJsonWithTimeout<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 3500
): Promise<{ ok: boolean; status: number; data: T | null }> {
  // Divide o orçamento entre request e body read.
  const requestBudget = Math.max(1000, Math.floor(timeoutMs * 0.6))
  const bodyBudget = Math.max(500, timeoutMs - requestBudget)

  const response = await fetchWithTimeout(input, init, requestBudget)
  let data: T | null = null
  try {
    const text = await readBodyWithTimeout(response, bodyBudget)
    if (text) {
      try {
        data = JSON.parse(text) as T
      } catch {
        data = null
      }
    }
  } catch {
    // body read timeout — devolve null mas mantém status code.
    data = null
  }
  return { ok: response.ok, status: response.status, data }
}

export function isFetchTimeout(error: unknown): boolean {
  return error instanceof FetchTimeoutError
}
