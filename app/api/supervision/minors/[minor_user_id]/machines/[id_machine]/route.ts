import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ minor_user_id: string; id_machine: string }> }
) {
  const log = apiFlow("supervision/minors/machines:PUT")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { minor_user_id, id_machine } = await params
    const body = await request.json().catch(() => ({}))
    const url = `${BACKEND}/supervision/minors/${minor_user_id}/machines/${id_machine}`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("PUT", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao atualizar acesso à máquina" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
