import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/store/prohibited-rules/[id]/occurrences:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${getBackendApiUrl()}/admin/store/prohibited-rules/${id}/occurrences`
    const response = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao listar ocorrências" }, { status: 500 })
  } finally { log.end(status) }
}
