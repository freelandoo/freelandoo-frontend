import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy catch-all do WhatsApp do usuário (mig 223). Encaminha /api/whatsapp/*
 * para o backend (/whatsapp/*). TUDO aqui exige Authorization: a caixa é de uma
 * pessoa só e carrega conversa de terceiros — nada aqui é público.
 *
 * ⚠️ O WEBHOOK da Evolution NÃO passa por aqui. Ele vai direto ao backend
 * (/webhooks/whatsapp): é chamada de máquina, recorrente, e fazê-la atravessar
 * a Vercel seria pagar uma invocação por mensagem que qualquer usuário recebe —
 * exatamente o que a regra da economia manda evitar.
 */
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.join("/")
  const log = apiFlow(`whatsapp/${sub}:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/whatsapp/${sub}${incoming.search}`

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
    status = response.status

    // A mídia recebida volta como BYTES, não JSON. Ler tudo como texto aqui
    // corromperia a imagem/áudio — por isso o desvio antes do JSON.parse.
    const type = response.headers.get("content-type") || ""
    if (!type.includes("application/json")) {
      const buffer = await response.arrayBuffer()
      return new Response(buffer, {
        status: response.status,
        headers: {
          "Content-Type": type || "application/octet-stream",
          "Cache-Control": "private, max-age=300",
        },
      })
    }

    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text }
    }
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
