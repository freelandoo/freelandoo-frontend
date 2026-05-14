import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function PATCH(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const log = apiFlow("me/portfolio/[itemId]:PATCH")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { itemId } = await params
    const body = await request.json()
    const url = `${BACKEND}/me/portfolio/${itemId}`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify(body),
    })
    log.backendFetch("PATCH", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao atualizar item" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const log = apiFlow("me/portfolio/[itemId]:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { itemId } = await params
    const url = `${BACKEND}/me/portfolio/${itemId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth },
    })
    log.backendFetch("DELETE", url, response.status)
    const data = await response.json().catch(() => ({}))
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao remover item" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
