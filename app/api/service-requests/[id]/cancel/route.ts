import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

/** POST /api/service-requests/[id]/cancel — cancela O.S. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = apiFlow("service-requests/cancel:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${BACKEND}/service-requests/${encodeURIComponent(id)}/cancel`
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
    return Response.json({ error: "Erro ao cancelar solicitação" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
