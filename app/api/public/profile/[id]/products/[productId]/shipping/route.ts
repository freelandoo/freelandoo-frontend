import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const log = apiFlow("public/profile/[id]/products/[productId]/shipping:POST")
  let status = 500
  log.start(request)
  try {
    const { id, productId } = await params
    const body = await request.json().catch(() => ({}))
    const url = `${backend()}/public/profile/${id}/products/${productId}/shipping`
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
    return Response.json({ error: "Erro ao calcular frete" }, { status: 500 })
  } finally { log.end(status) }
}
