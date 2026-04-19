import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request) {
  const log = apiFlow("media/upload")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      status = 400
      return Response.json({ error: "Arquivo não fornecido" }, { status: 400 })
    }

    const backendFormData = new FormData()
    backendFormData.append("file", file)

    const url = `${getBackendApiUrl()}/users/me/media/upload`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: backendFormData,
    })

    log.backendFetch("POST", url, response.status)

    const text = await response.text()

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao fazer upload de mídia" }
      }
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    if (!text) {
      status = 500
      return Response.json({ error: "Resposta vazia do servidor" }, { status: 500 })
    }

    const data = JSON.parse(text)
    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao fazer upload de mídia" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
