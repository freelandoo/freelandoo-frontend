import { getBackendApiUrl } from "@/lib/backend"
import { apiDebug, apiFlow } from "@/lib/api-logger"

export async function PUT(request: Request) {
  const log = apiFlow("users/me/avatar")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const formData = await request.formData()

    const file = formData.get("avatar") as File

    if (!file) {
      status = 400
      return Response.json({ error: "Arquivo não fornecido" }, { status: 400 })
    }

    const backendFormData = new FormData()
    backendFormData.append("avatar", file)

    const url = `${getBackendApiUrl()}/users/me/avatar`
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
      },
      body: backendFormData,
    })

    log.backendFetch("PUT", url, response.status)

    const text = await response.text()

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao atualizar avatar no backend" }
      }
      apiDebug("users/me/avatar", "backend-error-body", { status: response.status })
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    const data = text ? JSON.parse(text) : { success: true }
    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    const errorMessage = error instanceof Error ? error.message : "Erro ao atualizar avatar"
    status = 500
    return Response.json({ error: errorMessage }, { status: 500 })
  } finally {
    log.end(status)
  }
}
