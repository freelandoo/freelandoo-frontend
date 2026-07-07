import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/** Academias das quais o usuário é dono (painel de gestão). */
export async function GET(request: Request) {
  const log = apiFlow("me/academies:GET")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    const url = `${getBackendApiUrl()}/me/academies`
    const response = await fetch(url, {
      headers: { ...(auth ? { Authorization: auth } : {}) },
    })
    log.backendFetch("GET", url, response.status)
    const data = await response.json().catch(() => ({}))
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    return Response.json({ error: "Erro no proxy" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
