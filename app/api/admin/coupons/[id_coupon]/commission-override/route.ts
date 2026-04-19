import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

async function proxy(request: Request, method: "PUT" | "DELETE", id_coupon: string) {
  const log = apiFlow(`admin/coupons/${id_coupon}/commission-override:${method}`)
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${BACKEND}/admin/coupons/${id_coupon}/commission-override`
    const body = method === "PUT" ? await request.text() : undefined
    const response = await fetch(url, {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
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
    return Response.json({ error: "Erro proxy commission-override" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id_coupon: string }> }) {
  const { id_coupon } = await params
  return proxy(request, "PUT", id_coupon)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id_coupon: string }> }) {
  const { id_coupon } = await params
  return proxy(request, "DELETE", id_coupon)
}
