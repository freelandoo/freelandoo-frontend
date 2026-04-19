import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request) {
  const log = apiFlow("users/me/media")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const formData = await request.formData()
    const url = `${getBackendApiUrl()}/users/me/media/upload`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    })

    log.backendFetch("POST", url, response.status)

    const data = await response.json()

    if (!response.ok) {
      status = response.status
      return Response.json(data, { status: response.status })
    }

    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro no upload" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
