export class ClientFetchTimeoutError extends Error {
  constructor(message = "Request timed out") {
    super(message)
    this.name = "ClientFetchTimeoutError"
  }
}

export async function clientFetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  if (typeof AbortController === "undefined") {
    return fetch(input, init)
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new ClientFetchTimeoutError(`Request timed out after ${timeoutMs}ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function isClientFetchTimeout(error: unknown): boolean {
  return error instanceof ClientFetchTimeoutError
}
