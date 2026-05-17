import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const log = apiFlow("me/orders/[id]/label:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await ctx.params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${backend()}/me/orders/${encodeURIComponent(id)}/label`
    const response = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar etiqueta" }, { status: 500 })
  } finally { log.end(status) }
}
