import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const url = () => `${getBackendApiUrl()}/admin/booking-fees`

export async function GET(request: Request) {
  const log = apiFlow("admin/booking-fees:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const res = await fetch(url(), { headers: { Authorization: authHeader } })
    log.backendFetch("GET", url(), res.status)
    const data = await res.json()
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (error) {
    log.fail(error)
    return Response.json({ error: "Erro ao buscar taxas" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function PUT(request: Request) {
  const log = apiFlow("admin/booking-fees:PUT")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const body = await request.json()
    const res = await fetch(url(), {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("PUT", url(), res.status)
    const data = await res.json()
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (error) {
    log.fail(error)
    return Response.json({ error: "Erro ao salvar taxas" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
