import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id_profile: string }> }
) {
  const log = apiFlow("stories/by-profile/[id]:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_profile } = await params
    const url = `${BACKEND}/stories/by-profile/${encodeURIComponent(id_profile)}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    })
    log.backendFetch("GET", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao consultar stories" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
