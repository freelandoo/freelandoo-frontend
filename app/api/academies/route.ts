import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/** Raiz de /api/academies: GET lista/busca (público), POST cria (auth). */
async function forward(request: Request, method: string) {
  const log = apiFlow(`academies:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/academies${incoming.search}`
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
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
    return Response.json({ error: "Erro no proxy de academias" }, { status: 500 })
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
