import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ id: string; moduleId: string; lessonId: string }> },
) {
  const log = apiFlow(
    "me/courses/[id]/modules/[moduleId]/lessons/[lessonId]/comments:GET",
  )
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id, moduleId, lessonId } = await params
    const url = `${getBackendApiUrl()}/me/courses/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/comments`
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
