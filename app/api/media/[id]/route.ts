import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("media/[id]:PUT")
  let status = 500
  log.start(request)
  try {
    const { id: mediaId } = await params
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json()
    const url = `${getBackendApiUrl()}/users/me/media/${mediaId}`
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

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao atualizar mídia" }
      }
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    const data = text ? JSON.parse(text) : { success: true }
    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar mídia" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("media/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const { id: mediaId } = await params
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/users/me/media/${mediaId}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    })

    log.backendFetch("DELETE", url, response.status)

    if (!response.ok && response.status !== 204) {
      const text = await response.text()
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao deletar mídia" }
      }
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    status = 200
    return Response.json({ success: true })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao deletar mídia" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
