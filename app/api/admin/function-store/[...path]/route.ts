import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do admin da Loja de Funções. Encaminha /api/admin/function-store/*
 * para o backend (/admin/function-store/*), preservando método, querystring e
 * Authorization. PUT com multipart (upload da imagem do card) é re-empacotado
 * como FormData; POST segue como JSON.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`admin/function-store/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/admin/function-store/${sub}${incoming.search}`

    const init: RequestInit = { method, headers: { Authorization: auth } }
    const contentType = request.headers.get("content-type") || ""
    if (method === "PUT" && contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const backendForm = new FormData()
      formData.forEach((value, key) => backendForm.append(key, value as Blob | string))
      init.body = backendForm
    } else if (method === "POST" || method === "PUT" || method === "PATCH") {
      const text = await request.text()
      init.headers = { Authorization: auth, "Content-Type": "application/json" }
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
    return Response.json({ error: "Erro no proxy da Loja de Funções" }, { status: 500 })
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
