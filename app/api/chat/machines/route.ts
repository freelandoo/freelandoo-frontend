import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("chat/machines:GET")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const url = `${BACKEND}/chat/machines`
    const r = await fetch(url, {
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    })
    log.backendFetch("GET", url, r.status)
    const text = await r.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = r.status
    return Response.json(data, { status: r.status })
  } catch (e) {
    log.fail(e)
    return Response.json({ error: "Erro ao listar máquinas" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
