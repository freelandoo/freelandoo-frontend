import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request) {
  const log = apiFlow("store/price-preview:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const reqUrl = new URL(request.url)
    const seller_cents = reqUrl.searchParams.get("seller_cents") || "0"
    const url = `${getBackendApiUrl()}/store/price-preview?seller_cents=${encodeURIComponent(seller_cents)}`
    const response = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao calcular preview" }, { status: 500 })
  } finally { log.end(status) }
}
