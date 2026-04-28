import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request) {
  const log = apiFlow("admin/transactions")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/admin/transactions`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    })

    log.backendFetch("GET", url, response.status)

    const data = await response.json()

    if (!response.ok) {
      status = response.status
      return Response.json(data, { status: response.status })
    }

    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao buscar transações" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
