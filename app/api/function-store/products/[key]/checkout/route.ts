import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

// Compra de uma função (Stripe one-time, vitalícia).
// Backend: POST /function-store/products/:key/checkout → { checkout_url }
export async function POST(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const log = apiFlow("function-store/products/[key]/checkout:POST")
  let status = 500
  log.start(request)
  try {
    const { key } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/function-store/products/${encodeURIComponent(key)}/checkout`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader },
    })
    log.backendFetch("POST", url, response.status)
    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao iniciar compra" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
