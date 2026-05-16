import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const log = apiFlow("courses/public/by-profile:GET")
  let status = 500
  log.start(request)
  try {
    const { profileId } = await params
    const url = `${BACKEND}/courses/public/by-profile/${encodeURIComponent(profileId)}`
    const response = await fetch(url, { method: "GET", cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao listar cursos" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
