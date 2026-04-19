import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request) {
  const log = apiFlow("signup")
  let status = 500
  log.start(request)
  try {
    const body = await request.json()
    const url = `${getBackendApiUrl()}/auth/signup`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    log.backendFetch("POST", url, response.status)

    const data = await response.json()

    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao processar cadastro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
