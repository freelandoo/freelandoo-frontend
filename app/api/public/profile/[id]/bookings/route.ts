import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

// Criar booking público
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("public/profile/[id]/bookings:POST")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const body = await request.json()

    const url = `${backend()}/public/profile/${id}/bookings`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao criar agendamento" }, { status: 500 })
  } finally { log.end(status) }
}
