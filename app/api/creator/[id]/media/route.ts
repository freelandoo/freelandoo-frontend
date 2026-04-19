import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("creator/[id]/media")
  let status = 500
  log.start(request)
  try {
    const { id: creatorId } = await params
    const url = `${getBackendApiUrl()}/users/${creatorId}/media`
    const response = await fetch(url, {
      method: "GET",
    })

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      if (response.status === 404) {
        status = 200
        return Response.json([])
      }
      const text = await response.text()
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao buscar mídia do creator" }
      }
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    const text = await response.text()
    const data = text ? JSON.parse(text) : []
    const resultArray = Array.isArray(data) ? data : (data.media || data.data || [])

    status = 200
    return Response.json(resultArray)
  } catch (error) {
    log.fail(error)
    status = 200
    return Response.json([])
  } finally {
    log.end(status)
  }
}
