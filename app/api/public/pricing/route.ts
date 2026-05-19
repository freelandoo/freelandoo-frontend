import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { fetchWithTimeout, readBodyWithTimeout, isFetchTimeout } from "@/lib/server-fetch"

// Força dinâmico no build (evita prerender falhar se backend down).
export const dynamic = "force-dynamic"
export const revalidate = 300

const FALLBACK = { annual_fee_cents: 30000 }

export async function GET(request: Request) {
  const log = apiFlow("public/pricing:GET")
  let status = 500
  log.start(request)
  try {
    const url = `${getBackendApiUrl()}/public/pricing`
    const response = await fetchWithTimeout(url, { method: "GET" }, 4000)
    log.backendFetch("GET", url, response.status)
    if (!response.ok) {
      status = 200
      return Response.json(FALLBACK, {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60" },
      })
    }
    let data: unknown = FALLBACK
    try {
      const text = await readBodyWithTimeout(response, 2000)
      if (text) data = JSON.parse(text)
    } catch {
      data = FALLBACK
    }
    status = 200
    return Response.json(data, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    })
  } catch (error) {
    log.fail(error)
    status = isFetchTimeout(error) ? 504 : 500
    return Response.json(FALLBACK, { status: 200 })
  } finally { log.end(status) }
}
