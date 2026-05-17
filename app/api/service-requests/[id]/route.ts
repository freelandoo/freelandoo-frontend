import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("service-requests/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const url = `${getBackendApiUrl()}/service-requests/${id}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    })
    log.backendFetch("DELETE", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { ok: response.ok } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao remover solicitação" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
