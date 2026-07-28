import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

// Detalhe de um produto da Loja de Funções. Público.
// Backend: GET /function-store/products/:key → { product }
export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const log = apiFlow("function-store/products/[key]:GET")
  let status = 500
  log.start(request)
  try {
    const { key } = await params
    const url = `${getBackendApiUrl()}/function-store/products/${encodeURIComponent(key)}`
    const response = await fetch(url, { cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar função" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
