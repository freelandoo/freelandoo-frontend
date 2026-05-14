import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ itemId: string; mediaId: string }> },
) {
  const log = apiFlow("me/portfolio/[itemId]/media/[mediaId]:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { itemId, mediaId } = await params
    const url = `${BACKEND}/me/portfolio/${itemId}/media/${mediaId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth },
    })
    log.backendFetch("DELETE", url, response.status)
    const data = await response.json().catch(() => ({}))
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao remover mídia" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
