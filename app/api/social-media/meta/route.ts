import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("social-media/meta")
  let status = 500
  log.start(request)
  try {
    const url = `${BACKEND}/social-media/meta`
    const response = await fetch(url)

    log.backendFetch("GET", url, response.status)

    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao buscar metadados de redes sociais" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
