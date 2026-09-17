import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do painel do Atendente com IA (mig 253). Encaminha
 * /api/admin/ai/* para /admin/ai/* preservando método, querystring,
 * Authorization e body JSON.
 *
 * ⚠️ AQUI PASSA CHAVE DE PROVEDOR EM CLARO (o PUT de /keys/:provider). Ela
 * atravessa este proxy uma vez, no caminho da gravação, e o backend a sela
 * antes de guardar — quem lê de volta só recebe os 4 últimos caracteres. Por
 * isso não se acrescenta log de body neste arquivo: seria a chave em texto
 * puro no log da Vercel, que é exatamente o que o selamento existe para evitar.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`admin/ai/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/admin/ai/${sub}${incoming.search}`

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
    return Response.json({ error: "Erro no proxy do atendente" }, { status: 500 })
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
