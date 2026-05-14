import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const log = apiFlow("profile/[id]/services/[serviceId]/media:GET")
  let status = 500
  log.start(request)
  try {
    const { id, serviceId } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${backend()}/profile/${id}/services/${serviceId}/media`
    const response = await fetch(url, { headers: { Authorization: authHeader } })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar mídias do serviço" }, { status: 500 })
  } finally { log.end(status) }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const log = apiFlow("profile/[id]/services/[serviceId]/media:POST")
  let status = 500
  log.start(request)
  try {
    const { id, serviceId } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) { status = 400; return Response.json({ error: "Arquivo não fornecido" }, { status: 400 }) }

    const backendFormData = new FormData()
    backendFormData.append("file", file)

    const url = `${backend()}/profile/${id}/services/${serviceId}/media`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader },
      body: backendFormData,
    })
    log.backendFetch("POST", url, response.status)

    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text || "Erro ao fazer upload" } }

    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao fazer upload de mídia do serviço" }, { status: 500 })
  } finally { log.end(status) }
}
