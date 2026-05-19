import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()
const EMPTY = { has_new: false, unread_chats: 0 }

/** GET /api/service-requests/badge/me — badge para o user */
export async function GET(request: Request) {
  const log = apiFlow("service-requests/badge/me:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${BACKEND}/service-requests/badge/me`
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    }, 2500)
    log.backendFetch("GET", url, response.status)

    let data: unknown = EMPTY
    try {
      const text = await readBodyWithTimeout(response, 1500)
      if (text) data = JSON.parse(text)
    } catch {
      data = { ...EMPTY, timeout: true }
    }
    status = response.status
    return Response.json(data, { status: response.ok ? response.status : 200 })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ ...EMPTY, timeout: true }, { status: 200 })
    }
    status = 500
    return Response.json({ error: "Erro ao buscar badge" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
