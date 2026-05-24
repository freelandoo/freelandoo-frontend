import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const ALLOWED_ACTIONS = new Set(["start", "progress", "complete", "skip"])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ key: string; action: string }> },
) {
  const { key, action } = await params
  const log = apiFlow(`tour-paths/[key]/${action}:POST`)
  let status = 500
  log.start(request)
  try {
    if (!ALLOWED_ACTIONS.has(action)) {
      status = 404
      return Response.json({ error: "Ação inválida" }, { status: 404 })
    }
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const body = await request.text()
    const url = `${getBackendApiUrl()}/tour-paths/${encodeURIComponent(key)}/${action}`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body || "{}",
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
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
