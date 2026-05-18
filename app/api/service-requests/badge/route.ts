import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

/** GET /api/service-requests/badge?id_profile= — badge para o subperfil */
export async function GET(request: Request) {
  const log = apiFlow("service-requests/badge:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { search } = new URL(request.url)
    const url = `${BACKEND}/service-requests/badge${search || ""}`
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    }, 2500)
    log.backendFetch("GET", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ has_new: false, unread_chats: 0, timeout: true }, { status: 200 })
    }
    status = 500
    return Response.json({ error: "Erro ao buscar badge" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
