import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do painel de qualidade do WhatsApp (W6). Encaminha qualquer
 * rota sob /api/admin/whatsapp/* para o backend (/admin/whatsapp/*),
 * preservando método, querystring e Authorization.
 *
 * ⚠️ Catch-all de propósito: rota nova do painel (um refresh manual, um
 * histórico) passa a funcionar sem tocar neste arquivo. E ⚠️ NUNCA criar uma
 * pasta de parâmetro nomeado ao lado deste `[...path]` — dois nomes de param no
 * mesmo nível já travaram TODAS as lambdas de /api em produção por 14h, com os
 * logs em silêncio.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`admin/whatsapp/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/admin/whatsapp/${sub}${incoming.search}`

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
    return Response.json({ error: "Erro no proxy do WhatsApp" }, { status: 500 })
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
export async function DELETE(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "DELETE", path)
}
