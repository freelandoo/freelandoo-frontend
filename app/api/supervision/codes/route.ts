import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

async function forward(request: Request, method: "GET" | "POST") {
  const log = apiFlow(`supervision/codes:${method}`)
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${BACKEND}/supervision/codes`
    const init: RequestInit = {
      method,
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    }
    if (method === "POST") {
      init.body = JSON.stringify(await request.json().catch(() => ({})))
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
    return Response.json({ error: "Erro ao processar requisição" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export const GET = (request: Request) => forward(request, "GET")
export const POST = (request: Request) => forward(request, "POST")
