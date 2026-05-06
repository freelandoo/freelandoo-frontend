import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

/** POST /api/service-requests/mural/mark-seen — atualiza mural_last_seen_at */
export async function POST(request: Request) {
  const log = apiFlow("service-requests/mural/mark-seen:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const body = await request.text()
    const url = `${BACKEND}/service-requests/mural/mark-seen`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("POST", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao marcar como visto" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
