import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

/** GET /api/service-requests/mural?id_profile= — lista O.S. que matcheiam o subperfil */
export async function GET(request: Request) {
  const log = apiFlow("service-requests/mural:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { search } = new URL(request.url)
    const url = `${BACKEND}/service-requests/mural${search || ""}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
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
    return Response.json({ error: "Erro ao listar mural" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
