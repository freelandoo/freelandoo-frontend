import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

export async function GET(request: Request) {
  const log = apiFlow("check-username")
  let status = 500
  log.start(request)
  try {
    const u = new URL(request.url).searchParams.get("u") ?? ""
    const url = `${getBackendApiUrl()}/auth/check-username?u=${encodeURIComponent(u)}`
    const response = await fetchWithTimeout(url, { method: "GET" }, 5000)

    log.backendFetch("GET", url, response.status)

    const data = await response.json()
    status = response.ok ? 200 : response.status
    return Response.json(data, { status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ available: false, error: "Verificação demorou para responder." }, { status: 504 })
    }
    status = 500
    return Response.json({ available: false, error: "Erro ao verificar nome de usuário" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
