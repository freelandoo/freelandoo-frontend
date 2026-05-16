import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id_notification: string }> }
) {
  const log = apiFlow("me/notifications/[id]/mark-read:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_notification } = await params
    const url = `${BACKEND}/me/notifications/${encodeURIComponent(id_notification)}/mark-read`
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
    return Response.json({ error: "Erro ao marcar notificação como lida" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
