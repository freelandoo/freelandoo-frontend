import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

export async function POST(request: Request) {
  const log = apiFlow("google-signin")
  let status = 500
  log.start(request)
  try {
    const body = await request.json()
    const url = `${getBackendApiUrl()}/auth/google-signin`
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 5000)
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ error: "Login com Google demorou para responder. Tente novamente." }, { status: 504 })
    }
    status = 500
    return Response.json({ error: "Erro ao processar login com Google" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
