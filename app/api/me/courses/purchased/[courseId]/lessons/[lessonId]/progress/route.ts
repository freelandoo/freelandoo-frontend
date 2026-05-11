import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ courseId: string; lessonId: string }> },
) {
  const log = apiFlow(
    "me/courses/purchased/[courseId]/lessons/[lessonId]/progress:PUT",
  )
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { courseId, lessonId } = await params
    const body = await request.json().catch(() => ({}))
    const url = `${getBackendApiUrl()}/me/courses/purchased/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("PUT", url, response.status)
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
