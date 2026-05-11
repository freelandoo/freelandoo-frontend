import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const log = apiFlow("me/courses/purchased/[courseId]/player:GET")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { courseId } = await params
    const reqUrl = new URL(request.url)
    const lessonId = reqUrl.searchParams.get("lessonId")
    const suffix = lessonId
      ? `?lessonId=${encodeURIComponent(lessonId)}`
      : ""
    const url = `${getBackendApiUrl()}/me/courses/purchased/${encodeURIComponent(courseId)}/player${suffix}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    })
    log.backendFetch("GET", url, response.status)
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
