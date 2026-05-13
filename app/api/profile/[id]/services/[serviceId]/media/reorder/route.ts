import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const log = apiFlow("profile/[id]/services/[serviceId]/media/reorder:PATCH")
  let status = 500
  log.start(request)
  try {
    const { id, serviceId } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const body = await request.json()
    const url = `${backend()}/profile/${id}/services/${serviceId}/media/reorder`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("PATCH", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao reordenar mídias" }, { status: 500 })
  } finally { log.end(status) }
}
