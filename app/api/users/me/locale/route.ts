import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PUT(request: Request) {
  const log = apiFlow("users/me/locale:PUT")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json()
    const url = `${getBackendApiUrl()}/users/me/locale`
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    log.backendFetch("PUT", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    return Response.json({ error: "Erro ao salvar idioma" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
