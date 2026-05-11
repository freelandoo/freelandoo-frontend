import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

type Params = Promise<{ courseId: string; lessonId: string }>

async function forwardJson(
  request: Request,
  params: Params,
  method: "GET" | "POST",
) {
  const log = apiFlow(
    `me/courses/purchased/[courseId]/lessons/[lessonId]/comments:${method}`,
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
    const url = `${getBackendApiUrl()}/me/courses/purchased/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/comments`
    const init: RequestInit = {
      method,
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    }
    if (method === "POST") {
      init.body = JSON.stringify(await request.json().catch(() => ({})))
    }
    const response = await fetch(url, init)
    log.backendFetch(method, url, response.status)
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

export async function GET(request: Request, { params }: { params: Params }) {
  return forwardJson(request, params, "GET")
}

export async function POST(request: Request, { params }: { params: Params }) {
  return forwardJson(request, params, "POST")
}
