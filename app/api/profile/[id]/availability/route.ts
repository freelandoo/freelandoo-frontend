import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("profile/[id]/availability:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }

    const url = `${backend()}/profile/${id}/availability`
    const response = await fetch(url, { headers: { Authorization: authHeader } })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar disponibilidade" }, { status: 500 })
  } finally { log.end(status) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("profile/[id]/availability:POST")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }

    const body = await request.json()
    const url = `${backend()}/profile/${id}/availability`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify(body),
    })
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao salvar disponibilidade" }, { status: 500 })
  } finally { log.end(status) }
}
