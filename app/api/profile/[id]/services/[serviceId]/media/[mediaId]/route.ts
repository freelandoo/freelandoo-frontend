import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; serviceId: string; mediaId: string }> }) {
  const log = apiFlow("profile/[id]/services/[serviceId]/media/[mediaId]:DELETE")
  let status = 500
  log.start(request)
  try {
    const { id, serviceId, mediaId } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${backend()}/profile/${id}/services/${serviceId}/media/${mediaId}`
    const response = await fetch(url, { method: "DELETE", headers: { Authorization: authHeader } })
    log.backendFetch("DELETE", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao remover mídia" }, { status: 500 })
  } finally { log.end(status) }
}
