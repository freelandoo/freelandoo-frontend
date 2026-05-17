import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("product-requests/[id]/eligible-products:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const reqUrl = new URL(request.url)
    const id_profile = reqUrl.searchParams.get("id_profile") || ""
    const backendUrl = `${getBackendApiUrl()}/product-requests/${id}/eligible-products?id_profile=${encodeURIComponent(id_profile)}`
    const response = await fetch(backendUrl, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", backendUrl, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao listar produtos elegíveis" }, { status: 500 })
  } finally { log.end(status) }
}
