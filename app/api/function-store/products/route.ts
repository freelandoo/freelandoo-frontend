import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

// Vitrine da Loja de Funções (carrossel /funcoes). Público.
// Backend: GET /function-store/products → { products: [...] }
export async function GET(request: Request) {
  const log = apiFlow("function-store/products:GET")
  let status = 500
  log.start(request)
  try {
    const url = `${getBackendApiUrl()}/function-store/products`
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
      { error: error instanceof Error ? error.message : "Erro ao carregar funções" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
