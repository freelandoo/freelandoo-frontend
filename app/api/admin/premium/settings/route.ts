import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

async function proxy(request: Request, method: "GET" | "PUT") {
  const log = apiFlow(`admin/premium/settings:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${getBackendApiUrl()}/admin/premium/settings`
    const init: RequestInit = {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
    }
    if (method === "PUT") init.body = await request.text()
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

export async function GET(request: Request) { return proxy(request, "GET") }
export async function PUT(request: Request) { return proxy(request, "PUT") }
