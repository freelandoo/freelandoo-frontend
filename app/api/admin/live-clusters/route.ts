import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy raiz dos Clusters de Live (admin): GET lista + POST cria.
 * Sub-rotas (membros/botões/start/end/signal) vão pelo catch-all [...path].
 */
async function forward(request: Request, method: string) {
  const log = apiFlow(`admin/live-clusters:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/admin/live-clusters`
    const init: RequestInit = {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
    }
    if (method === "POST") {
      const text = await request.text()
      if (text) init.body = text
    }

    const response = await fetch(url, init)
    log.backendFetch(method, url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro no proxy de clusters" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function GET(request: Request) {
  return forward(request, "GET")
}
export async function POST(request: Request) {
  return forward(request, "POST")
}
