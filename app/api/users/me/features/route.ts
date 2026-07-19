import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

// Preferências de funções do usuário (seção "Funções" do menu lateral).
// Backend: GET /users/me/features → { features: { key: bool } }
export async function GET(request: Request) {
  const log = apiFlow("users/me/features:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/users/me/features`
    const response = await fetch(url, {
      headers: { Authorization: authHeader },
      cache: "no-store",
    })

    log.backendFetch("GET", url, response.status)

    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao carregar funções" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
