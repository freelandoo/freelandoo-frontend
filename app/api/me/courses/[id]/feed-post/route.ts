import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

type Params = Promise<{ id: string }>

async function proxy(
  request: Request,
  params: Params,
  method: "GET" | "POST" | "DELETE",
) {
  const log = apiFlow(`me/courses/[id]/feed-post:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const { id } = await params
    const url = `${getBackendApiUrl()}/me/courses/${encodeURIComponent(id)}/feed-post`
    const init: RequestInit = {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    }
    if (method === "POST") {
      const body = await request.json().catch(() => ({}))
      init.body = JSON.stringify(body)
    }

    const response = await fetch(url, init)
    log.backendFetch(method, url, response.status)
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function GET(request: Request, { params }: { params: Params }) {
  return proxy(request, params, "GET")
}

export async function POST(request: Request, { params }: { params: Params }) {
  return proxy(request, params, "POST")
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  return proxy(request, params, "DELETE")
}
