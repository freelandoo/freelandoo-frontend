import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_invite: string }> }
) {
  const log = apiFlow("supervision/codes/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_invite } = await params
    const url = `${BACKEND}/supervision/codes/${id_invite}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: authHeader },
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
    return Response.json({ error: "Erro ao revogar código" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
