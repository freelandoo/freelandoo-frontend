import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("users/me/coupon:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${BACKEND}/coupon/`
    const response = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      },
      4000
    )

    log.backendFetch("GET", url, response.status)

    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }

    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ data: [] }, { status: 200 })
    }
    status = 500
    return Response.json({ error: "Erro ao consultar cupom" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function POST(request: Request) {
  const log = apiFlow("users/me/coupon:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${BACKEND}/coupon/`
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
      },
      6000
    )

    log.backendFetch("POST", url, response.status)

    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }

    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ error: "Geração de cupom demorou" }, { status: 504 })
    }
    status = 500
    return Response.json({ error: "Erro ao gerar cupom" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
