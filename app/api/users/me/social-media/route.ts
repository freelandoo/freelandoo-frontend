import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request) {
  const log = apiFlow("users/me/social-media")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json()
    const url = `${getBackendApiUrl()}/socialmedia`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    log.backendFetch("POST", url, response.status)

    const text = await response.text()

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao criar rede social" }
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
      { error: error instanceof Error ? error.message : "Erro ao criar rede social" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
