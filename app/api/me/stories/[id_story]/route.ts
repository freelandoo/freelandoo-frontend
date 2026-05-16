import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_story: string }> }
) {
  const log = apiFlow("me/stories/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_story } = await params
    const url = `${BACKEND}/me/stories/${encodeURIComponent(id_story)}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
    })
    log.backendFetch("DELETE", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao deletar story" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
