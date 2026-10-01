import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy do CARRINHO DA LOJA (mig 271): `/api/store-carts/*` → `/store-carts/*`.
 *
 * ⚠️ É POR AQUI, E NÃO DIRETO NO RAILWAY, de propósito: o site da cliente é
 * servido em três origens (plataforma, subdomínio e domínio próprio) e o
 * `proxy.ts` não reescreve `/api` — então `/api/store-carts` responde nas três,
 * sem abrir CORS do backend para domínio de cliente. É uma chamada por compra,
 * não um pulso recorrente: o custo de invocação da Vercel aqui é irrelevante.
 *
 * Porta anônima (a compradora não precisa de conta); o Authorization só é
 * repassado quando existe.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.map(encodeURIComponent).join("/")
  const log = apiFlow(`store-carts/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const url = `${getBackendApiUrl()}/store-carts/${sub}`
    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: "no-store",
    }
    if (method === "POST") {
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
    return Response.json({ error: "Erro no proxy do carrinho" }, { status: 500 })
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
