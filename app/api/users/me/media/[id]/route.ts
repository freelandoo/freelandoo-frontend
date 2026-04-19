import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("users/me/media/[id]")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const { id: mediaId } = await params
    const url = `${getBackendApiUrl()}/users/me/media/${mediaId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    })

    log.backendFetch("DELETE", url, response.status)

    if (!response.ok && response.status !== 204) {
      const data = await response.json()
      status = response.status
      return Response.json(data, { status: response.status })
    }

    status = 200
    return Response.json({ success: true })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao deletar mídia" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
