import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function PATCH(request: Request, { params }: { params: Promise<{ id_batch: string }> }) {
  const { id_batch } = await params
  const log = apiFlow(`admin/affiliate/payouts/${id_batch}/status:PATCH`)
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const body = await request.text()
    const url = `${BACKEND}/admin/affiliate/payouts/${id_batch}/status`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("PATCH", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao atualizar status do lote" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
