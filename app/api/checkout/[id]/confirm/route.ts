import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("checkout/[id]/confirm")
  let status = 500
  log.start(request)
  try {
    const { id: checkoutId } = await params
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    let body: string | undefined
    try {
      const raw = await request.text()
      body = raw.trim() ? raw : undefined
    } catch {
      body = undefined
    }

    const url = `${BACKEND}/checkout/${checkoutId}/confirm`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      ...(body !== undefined ? { body } : {}),
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
    return Response.json({ error: "Erro ao confirmar checkout" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
