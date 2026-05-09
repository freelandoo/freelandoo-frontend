import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

async function passthrough(
  request: Request,
  method: "POST" | "DELETE",
  id: string,
) {
  const log = apiFlow(`admin/manifestations/products/[id]/feature:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${getBackendApiUrl()}/admin/manifestations/products/${encodeURIComponent(id)}/feature`
    const response = await fetch(url, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch(method, url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return passthrough(request, "POST", id)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return passthrough(request, "DELETE", id)
}
