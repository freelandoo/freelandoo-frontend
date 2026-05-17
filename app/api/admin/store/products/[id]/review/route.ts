import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/store/products/[id]/review:POST")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const body = await request.json()
    const url = `${getBackendApiUrl()}/admin/store/products/${id}/review`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao revisar produto" }, { status: 500 })
  } finally { log.end(status) }
}
