import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

// PUT /users/me/features/:key { enabled } — liga/desliga uma função da
// experiência do próprio usuário.
export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const log = apiFlow("users/me/features/[key]:PUT")
  let status = 500
  log.start(request)
  try {
    const { key } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json()
    const url = `${getBackendApiUrl()}/users/me/features/${encodeURIComponent(key)}`
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    log.backendFetch("PUT", url, response.status)

    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar função" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
