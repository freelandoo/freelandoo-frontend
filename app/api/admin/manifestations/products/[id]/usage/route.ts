import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const log = apiFlow("admin/manifestations/products/[id]/usage:GET")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token nao fornecido" }, { status })
    }
    const incoming = new URL(request.url)
    const url = `${getBackendApiUrl()}/admin/manifestations/products/${encodeURIComponent(id)}/usage${incoming.search}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: auth },
    })
    log.backendFetch("GET", url, response.status)
    const text = await response.text()
    status = response.status

    if (incoming.searchParams.get("format") === "csv") {
      return new Response(text, {
        status,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "text/csv; charset=utf-8",
          "Content-Disposition": response.headers.get("Content-Disposition") || "attachment",
        },
      })
    }

    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    return Response.json(data, { status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro" }, { status })
  } finally {
    log.end(status)
  }
}
