import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id_category: string }> }
) {
  const log = apiFlow("admin/categories/[id]:PATCH")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_category } = await params
    const body = await request.text()
    const url = `${getBackendApiUrl()}/admin/categories/${encodeURIComponent(id_category)}`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("PATCH", url, response.status)
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
    return Response.json({ error: "Erro ao atualizar profissão" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
