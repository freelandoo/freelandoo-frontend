function pathOnly(input: RequestInfo | URL): string {
  try {
    if (typeof input === "string") {
      if (input.startsWith("/")) return input.split("?")[0] ?? input
      return new URL(input).pathname
    }
    if (input instanceof URL) return input.pathname
    return new URL(input.url).pathname
  } catch {
    return String(input).slice(0, 80)
  }
}

/** `fetch` com logs de início, status e tempo (cliente ou servidor). */
export async function fetchWithLog(
  scope: string,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const method = init?.method ?? "GET"
  const path = pathOnly(input)
  const t0 = Date.now()
  console.info(`[fetch:${scope}]`, "start", JSON.stringify({ method, path }))
  try {
    const res = await fetch(input, init)
    console.info(
      `[fetch:${scope}]`,
      "end",
      JSON.stringify({ method, path, status: res.status, ms: Date.now() - t0 })
    )
    return res
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(
      `[fetch:${scope}]`,
      "throw",
      msg,
      JSON.stringify({ method, path, ms: Date.now() - t0 })
    )
    throw e
  }
}
