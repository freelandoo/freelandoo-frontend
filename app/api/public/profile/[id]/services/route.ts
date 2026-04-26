import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("public/profile/[id]/services:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const url = `${backend()}/public/profile/${id}/services`
    const response = await fetch(url)
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar serviços" }, { status: 500 })
  } finally { log.end(status) }
}
