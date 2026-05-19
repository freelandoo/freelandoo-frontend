import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

export const runtime = "edge"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("me/notifications/unread-count:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${BACKEND}/me/notifications/unread-count`
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    }, 2500)
    log.backendFetch("GET", url, response.status)

    let data: unknown = { unread_count: 0 }
    try {
      const text = await readBodyWithTimeout(response, 1500)
      if (text) data = JSON.parse(text)
    } catch {
      data = { unread_count: 0, timeout: true }
    }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ unread_count: 0, timeout: true }, { status: 200 })
    }
    status = 500
    return Response.json({ error: "Erro ao consultar notificações" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
