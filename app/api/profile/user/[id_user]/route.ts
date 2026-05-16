import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id_user: string }> }
) {
  const log = apiFlow("profile/user/[id_user]:GET")
  let status = 500
  log.start(request)
  try {
    const { id_user } = await params
    const authHeader = request.headers.get("Authorization")
    const url = `${BACKEND}/profile/user/${encodeURIComponent(id_user)}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
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
    return Response.json({ error: "Erro ao listar perfis" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
