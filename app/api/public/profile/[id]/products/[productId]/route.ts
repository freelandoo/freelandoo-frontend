import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  const log = apiFlow("public/profile/[id]/products/[productId]:GET")
  let status = 500
  log.start(request)
  try {
    const { id, productId } = await params
    const url = `${backend()}/public/profile/${id}/products/${productId}`
    const response = await fetch(url, { cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar produto" }, { status: 500 })
  } finally { log.end(status) }
}
