import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export const revalidate = 300

export async function GET(request: Request) {
  const log = apiFlow("public/pricing:GET")
  let status = 500
  log.start(request)
  try {
    const url = `${getBackendApiUrl()}/public/pricing`
    const response = await fetch(url, { next: { revalidate: 300 } })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, {
      status: response.status,
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar preços" }, { status: 500 })
  } finally { log.end(status) }
}
