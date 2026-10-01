import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy das COLEÇÕES DA LOJA (mig 271):
 * `/api/profile/:id/product-collections[/*]` → `/profile/:id/product-collections[/*]`.
 *
 * A capa sobe em multipart: o corpo é repassado em bytes com o MESMO
 * Content-Type (é ele que carrega o boundary). O resto é JSON.
 */
async function forward(request: Request, method: string, id: string, pathParts: string[] = []) {
  const sub = pathParts.map(encodeURIComponent).join("/")
  const tail = sub ? `/${sub}` : ""
  const log = apiFlow(`profile/${id}/product-collections${tail}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const type = request.headers.get("Content-Type") || ""
    const url = `${getBackendApiUrl()}/profile/${encodeURIComponent(id)}/product-collections${tail}`
    const headers: Record<string, string> = auth ? { Authorization: auth } : {}
    const init: RequestInit = { method, headers, cache: "no-store" }
    if (method !== "GET" && method !== "DELETE") {
      if (type.startsWith("multipart/form-data")) {
        headers["Content-Type"] = type
        init.body = await request.arrayBuffer()
      } else {
        headers["Content-Type"] = "application/json"
        const text = await request.text()
        if (text) init.body = text
      }
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
    return Response.json({ error: "Erro no proxy de coleções" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

type Ctx = { params: Promise<{ id: string; path?: string[] }> }

export async function GET(request: Request, ctx: Ctx) {
  const { id, path } = await ctx.params
  return forward(request, "GET", id, path)
}
export async function POST(request: Request, ctx: Ctx) {
  const { id, path } = await ctx.params
  return forward(request, "POST", id, path)
}
export async function PATCH(request: Request, ctx: Ctx) {
  const { id, path } = await ctx.params
  return forward(request, "PATCH", id, path)
}
export async function PUT(request: Request, ctx: Ctx) {
  const { id, path } = await ctx.params
  return forward(request, "PUT", id, path)
}
export async function DELETE(request: Request, ctx: Ctx) {
  const { id, path } = await ctx.params
  return forward(request, "DELETE", id, path)
}
