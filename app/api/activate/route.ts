import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

export async function GET(request: Request) {
  const log = apiFlow("activate")
  let status = 500
  log.start(request)
  try {
    const token = new URL(request.url).searchParams.get("token") ?? ""
    const url = `${getBackendApiUrl()}/auth/activate?token=${encodeURIComponent(token)}`
    const response = await fetchWithTimeout(url, { method: "GET" }, 10000)

    log.backendFetch("GET", url, response.status)

    const data = await response.json()
    status = response.ok ? 200 : response.status
    return Response.json(data, { status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ error: "A ativação demorou para responder." }, { status: 504 })
    }
    status = 500
    return Response.json({ error: "Erro ao ativar conta" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
