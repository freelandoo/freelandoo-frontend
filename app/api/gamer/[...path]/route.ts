import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do perfil gamer (mig 220). Encaminha /api/gamer/* para o
 * backend (/gamer/*): provedores, estante, comparação, sync e desconexão.
 *
 * ⚠️ O CALLBACK DA PLATAFORMA NÃO PASSA POR AQUI, e não pode passar. Quem chama
 * `/gamer/steam/callback` é a Steam mandando o NAVEGADOR de volta, direto no
 * endereço público do backend — o `return_to` do OpenID é montado lá e a Steam
 * exige que ele esteja dentro do realm que ela mostrou na tela. Passar por este
 * proxy trocaria o host no meio do caminho e a Steam recusaria a volta.
 *
 * `/api/gamer/steam/connect` (que só devolve a URL para onde ir) passa por aqui
 * normalmente — quem redireciona é o navegador da pessoa, depois.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`gamer/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/gamer/${sub}${incoming.search}`

    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
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
    return Response.json({ error: "Erro no proxy do perfil gamer" }, { status: 500 })
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
