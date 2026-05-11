import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

type Params = Promise<{
  id: string
  moduleId: string
  lessonId: string
  questionId: string
}>

export async function PUT(
  request: Request,
  { params }: { params: Params },
) {
  const log = apiFlow(
    "me/courses/[id]/modules/[moduleId]/lessons/[lessonId]/questions/[questionId]:PUT",
  )
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id, moduleId, lessonId, questionId } = await params
    const body = await request.json().catch(() => ({}))
    const url = `${getBackendApiUrl()}/me/courses/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/questions/${encodeURIComponent(questionId)}`
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

export async function DELETE(
  request: Request,
  { params }: { params: Params },
) {
  const log = apiFlow(
    "me/courses/[id]/modules/[moduleId]/lessons/[lessonId]/questions/[questionId]:DELETE",
  )
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id, moduleId, lessonId, questionId } = await params
    const url = `${getBackendApiUrl()}/me/courses/${encodeURIComponent(id)}/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}/questions/${encodeURIComponent(questionId)}`
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
