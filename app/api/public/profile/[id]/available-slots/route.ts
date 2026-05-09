import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

// Slots disponíveis (público)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("public/profile/[id]/available-slots:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const forwarded = new URLSearchParams()
    searchParams.forEach((value, key) => {
      forwarded.append(key, value)
    })
    const qs = forwarded.toString()
    const url = `${backend()}/public/profile/${id}/available-slots${qs ? `?${qs}` : ""}`
    const response = await fetch(url, { cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar horários" }, { status: 500 })
  } finally { log.end(status) }
}
