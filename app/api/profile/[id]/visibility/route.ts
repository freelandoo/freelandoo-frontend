import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = apiFlow("profile/[id]/visibility:PATCH")
  let status = 500
  log.start(request)
  try {
    const { id: profileId } = await params
    const body = await request.json()
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const url = `${getBackendApiUrl()}/profile/${profileId}/visibility`
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    })
    log.backendFetch("PATCH", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao alterar visibilidade" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
