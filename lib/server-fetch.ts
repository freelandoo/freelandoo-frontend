export class FetchTimeoutError extends Error {
  constructor(message = "Fetch timed out") {
    super(message)
    this.name = "FetchTimeoutError"
  }
}

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

export function isFetchTimeout(error: unknown): boolean {
  return error instanceof FetchTimeoutError
}
