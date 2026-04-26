import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("profile/[id]/calendar/week:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }

    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get("weekStart") || ""
    const weekEnd = searchParams.get("weekEnd") || ""
    const url = `${backend()}/profile/${id}/calendar/week?weekStart=${weekStart}&weekEnd=${weekEnd}`
    const response = await fetch(url, { headers: { Authorization: authHeader } })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar semana" }, { status: 500 })
  } finally { log.end(status) }
}
