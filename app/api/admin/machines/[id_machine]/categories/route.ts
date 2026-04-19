import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id_machine: string }> }
) {
  const log = apiFlow("admin/machines/[id]/categories:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_machine } = await params
    const body = await request.text()
    const url = `${getBackendApiUrl()}/admin/machines/${encodeURIComponent(id_machine)}/categories`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("POST", url, response.status)
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao adicionar profissão" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
