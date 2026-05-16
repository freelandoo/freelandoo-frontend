import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const log = apiFlow("portfolio/comments/[commentId]/like:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { commentId } = await params
    const url = `${BACKEND}/portfolio/comments/${encodeURIComponent(commentId)}/like`
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch("POST", url, res.status)
    const text = await res.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (err) {
    log.fail(err)
    return Response.json({ error: "Erro ao curtir comentário" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
