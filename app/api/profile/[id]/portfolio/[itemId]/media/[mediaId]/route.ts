import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string; mediaId: string }> }
) {
  const log = apiFlow("profile/[id]/portfolio/[itemId]/media/[mediaId]")
  let status = 500
  log.start(request)
  try {
    const { id: profileId, itemId, mediaId } = await params
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }

    const url = `${BACKEND}/profiles/${profileId}/portfolio/${itemId}/media/${mediaId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    })

    log.backendFetch("DELETE", url, response.status)

    if (response.status === 204) {
      status = 204
      return new Response(null, { status: 204 })
    }

    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao remover mídia do portfólio" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
