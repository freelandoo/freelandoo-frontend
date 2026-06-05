import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all (GET) para /subprofiles/* — xp-summary, xp-events, xp-feed.
 * Público (auth opcional). Encaminha querystring e Authorization se houver.
 */
export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const sub = path.join("/")
  const log = apiFlow(`subprofiles/${sub}:GET`)
  let status = 500
  log.start(request)
  try {
    const search = new URL(request.url).search
    const url = `${getBackendApiUrl()}/subprofiles/${sub}${search}`
    const auth = request.headers.get("Authorization")
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
    })
    log.backendFetch("GET", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro no proxy de subprofiles" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
