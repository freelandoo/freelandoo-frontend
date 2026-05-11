import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function DELETE(
  request: Request,
  {
    params,
  }: { params: Promise<{ courseId: string; lessonId: string; commentId: string }> },
) {
  const log = apiFlow(
    "me/courses/purchased/[courseId]/lessons/[lessonId]/comments/[commentId]:DELETE",
  )
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { courseId, lessonId, commentId } = await params
    const url = `${getBackendApiUrl()}/me/courses/purchased/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/comments/${encodeURIComponent(commentId)}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth },
    })
    log.backendFetch("DELETE", url, response.status)
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
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
