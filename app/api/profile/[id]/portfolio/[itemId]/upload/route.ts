import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const log = apiFlow("profile/[id]/portfolio/[itemId]/upload")
  let status = 500
  log.start(request)
  try {
    const { id: profileId, itemId } = await params
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }

    const formData = await request.formData()
    const url = `${BACKEND}/profile/${profileId}/portfolio/${itemId}/upload`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader },
      body: formData,
    })

    log.backendFetch("POST", url, response.status)

    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao fazer upload de mídia" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
