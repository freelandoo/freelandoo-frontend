import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const log = apiFlow("premium/quote/[profileId]:GET")
  let status = 500
  log.start(request)
  try {
    const { profileId } = await params
    const url = `${getBackendApiUrl()}/premium/quote/${encodeURIComponent(profileId)}`
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
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
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
