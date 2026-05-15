import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const log = apiFlow("portfolio/items/[itemId]/comments:GET")
  let status = 500
  log.start(request)
  try {
    const { itemId } = await params
    const { searchParams } = new URL(request.url)
    const sp = new URLSearchParams()
    const cursor = searchParams.get("cursor")
    const limit = searchParams.get("limit")
    if (cursor) sp.set("cursor", cursor)
    if (limit) sp.set("limit", limit)

    const qs = sp.toString()
    const url = `${BACKEND}/portfolio/items/${itemId}/comments${qs ? `?${qs}` : ""}`

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = request.headers.get("Authorization")
    if (auth) headers["Authorization"] = auth

    const res = await fetch(url, { method: "GET", headers, cache: "no-store" })
    log.backendFetch("GET", url, res.status)
    const data = await res.json().catch(() => ({}))
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (err) {
    log.fail(err)
    return Response.json({ error: "Erro ao carregar comentários" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const log = apiFlow("portfolio/items/[itemId]/comments:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { itemId } = await params
    const body = await request.json().catch(() => null)
    if (!body) return Response.json({ error: "Body inválido" }, { status: 400 })

    const url = `${BACKEND}/portfolio/items/${itemId}/comments`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    })
    log.backendFetch("POST", url, res.status)
    const data = await res.json().catch(() => ({}))
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (err) {
    log.fail(err)
    return Response.json({ error: "Erro ao publicar comentário" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
