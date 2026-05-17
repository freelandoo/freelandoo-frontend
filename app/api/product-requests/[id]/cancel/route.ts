import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("product-requests/[id]/cancel:POST")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${getBackendApiUrl()}/product-requests/${id}/cancel`
    const response = await fetch(url, { method: "POST", headers: { Authorization: authHeader } })
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao cancelar pedido" }, { status: 500 })
  } finally { log.end(status) }
}
