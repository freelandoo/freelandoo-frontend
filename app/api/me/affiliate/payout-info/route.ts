import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function PUT(request: Request) {
  const log = apiFlow("me/affiliate/payout-info:PUT")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.text()
    const url = `${BACKEND}/me/affiliate/payout-info`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("PUT", url, response.status)

    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao atualizar dados de pagamento" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
