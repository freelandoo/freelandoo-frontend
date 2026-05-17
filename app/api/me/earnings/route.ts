import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

const FORWARDED = ["kind", "page", "per_page"] as const

export async function GET(request: Request) {
  const log = apiFlow("me/earnings:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params = new URLSearchParams()
    for (const key of FORWARDED) {
      const value = searchParams.get(key)
      if (value) params.append(key, value)
    }

    const qs = params.toString()
    const url = `${BACKEND}/me/earnings${qs ? `?${qs}` : ""}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      cache: "no-store",
    })
    log.backendFetch("GET", url, response.status)

    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao consultar faturamentos" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
