import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const log = apiFlow("portfolio/comments/[commentId]:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { commentId } = await params
    const url = `${BACKEND}/portfolio/comments/${commentId}`
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth },
    })
    log.backendFetch("DELETE", url, res.status)
    const data = await res.json().catch(() => ({}))
    status = res.status
    return Response.json(data, { status: res.status })
  } catch (err) {
    log.fail(err)
    return Response.json({ error: "Erro ao remover comentário" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
