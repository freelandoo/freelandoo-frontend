import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do Painel de Arquitetura. Encaminha qualquer rota sob
 * /api/admin/architecture/* para o backend (/admin/architecture/*),
 * preservando método, querystring, Authorization e body JSON.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`admin/architecture/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const incoming = new URL(request.url)
    const search = incoming.search // inclui o "?" se houver
    const url = `${getBackendApiUrl()}/admin/architecture/${sub}${search}`

    const init: RequestInit = {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
    }
    if (method === "POST" || method === "PATCH" || method === "PUT") {
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
    return Response.json({ error: "Erro no proxy de arquitetura" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

type Ctx = { params: Promise<{ path: string[] }> }

export async function GET(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "GET", path)
}
export async function POST(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "POST", path)
}
export async function PATCH(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "PATCH", path)
}
export async function DELETE(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "DELETE", path)
}
