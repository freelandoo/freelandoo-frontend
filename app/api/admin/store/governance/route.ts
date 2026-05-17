import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request) {
  const log = apiFlow("admin/store/governance:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${getBackendApiUrl()}/admin/store/governance`
    const response = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar governança" }, { status: 500 })
  } finally { log.end(status) }
}

export async function PUT(request: Request) {
  const log = apiFlow("admin/store/governance:PUT")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const body = await request.json()
    const url = `${getBackendApiUrl()}/admin/store/governance`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("PUT", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao atualizar governança" }, { status: 500 })
  } finally { log.end(status) }
}
