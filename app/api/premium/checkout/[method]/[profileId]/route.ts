import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ method: string; profileId: string }> }
) {
  const log = apiFlow("premium/checkout/[method]/[profileId]:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { method, profileId } = await params
    if (method !== "polens" && method !== "stripe") {
      status = 400
      return Response.json({ error: "method inválido" }, { status: 400 })
    }
    const url = `${getBackendApiUrl()}/premium/checkout/${method}/${encodeURIComponent(profileId)}`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch("POST", url, response.status)
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
