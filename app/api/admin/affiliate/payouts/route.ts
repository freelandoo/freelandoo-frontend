import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

async function proxy(request: Request, method: "GET" | "POST") {
  const log = apiFlow(`admin/affiliate/payouts:${method}`)
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { search } = new URL(request.url)
    const url = `${BACKEND}/admin/affiliate/payouts${method === "GET" ? search || "" : ""}`
    const body = method === "POST" ? await request.text() : undefined
    const response = await fetch(url, {
      method,
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch(method, url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro no proxy payouts" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export const GET = (req: Request) => proxy(req, "GET")
export const POST = (req: Request) => proxy(req, "POST")
