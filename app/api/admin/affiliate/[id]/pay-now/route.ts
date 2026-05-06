import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = apiFlow(`admin/affiliate/${id}/pay-now:POST`)
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const body = await request.text()
    const url = `${BACKEND}/admin/affiliate/${id}/pay-now`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("POST", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao marcar comissões como pagas" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
