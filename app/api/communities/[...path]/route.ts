import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all das Comunidades. Encaminha /api/communities/* para o backend
 * (/communities/*), preservando método, querystring, Authorization e body JSON.
 * GET é público (leitura indexada); POST/PATCH repassam o token quando houver.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`communities/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const incoming = new URL(request.url)
    const search = incoming.search
    const url = `${getBackendApiUrl()}/communities/${sub}${search}`

    const contentType = request.headers.get("Content-Type") || ""
    const isMultipart = contentType.toLowerCase().startsWith("multipart/form-data")

    const init: RequestInit = {
      method,
      headers: {
        // Em multipart preservamos o Content-Type original (com boundary) e
        // encaminhamos os bytes crus; em JSON forçamos application/json.
        ...(isMultipart ? { "Content-Type": contentType } : { "Content-Type": "application/json" }),
        ...(auth ? { Authorization: auth } : {}),
      },
    }
    if (method === "POST" || method === "PATCH" || method === "PUT") {
      if (isMultipart) {
        init.body = Buffer.from(await request.arrayBuffer())
      } else {
        const text = await request.text()
        if (text) init.body = text
      }
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
    return Response.json({ error: "Erro no proxy de comunidades" }, { status: 500 })
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
