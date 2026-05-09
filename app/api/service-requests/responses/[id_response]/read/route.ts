import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

/** POST /api/service-requests/responses/[id_response]/read — marca chat de O.S. como lido */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id_response: string }> }
) {
  const { id_response } = await params
  const log = apiFlow("service-requests/read:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${BACKEND}/service-requests/responses/${encodeURIComponent(id_response)}/read`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
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
    return Response.json({ error: "Erro ao marcar O.S. como lida" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
