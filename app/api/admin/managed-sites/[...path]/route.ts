import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do site feito pela Freelandoo (mig 241).
 *
 * Encaminha `/api/admin/managed-sites/*` para `/admin/managed-sites/*`,
 * preservando método, querystring, Authorization e corpo JSON.
 *
 * ⚠️ ESTE PROXY NÃO É A TRAVA. Quem recusa quem não é administrador é o
 * `roleMiddleware` do backend, em todas as rotas de lá — aqui só se repassa o
 * cabeçalho. Uma checagem de papel deste lado daria a impressão de porta
 * fechada e a porta continuaria aberta para quem chamasse o backend direto.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`admin/managed-sites/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/admin/managed-sites/${sub}${incoming.search}`

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
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text }
    }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro no proxy do site pronto" }, { status: 500 })
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
export async function PUT(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "PUT", path)
}
export async function DELETE(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "DELETE", path)
}
