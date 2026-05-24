import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const ALLOWED_ACTIONS = new Set(["status", "select", "dismiss"])

async function proxy(
  request: Request,
  action: string,
  method: "GET" | "POST",
) {
  const log = apiFlow(`onboarding/monetization/${action}:${method}`)
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

    const url = `${getBackendApiUrl()}/onboarding/monetization/${action}`
    const init: RequestInit = {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
    }
    if (method === "POST") {
      const body = await request.text()
      init.body = body || "{}"
    }
    const response = await fetch(url, init)
    log.backendFetch(method, url, response.status)
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

export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  return proxy(request, action, "GET")
}

export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params
  return proxy(request, action, "POST")
}
