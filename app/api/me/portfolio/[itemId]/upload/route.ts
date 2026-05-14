import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function POST(request: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const log = apiFlow("me/portfolio/[itemId]/upload:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { itemId } = await params
    const formData = await request.formData()
    const url = `${BACKEND}/me/portfolio/${itemId}/upload`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth },
      body: formData,
    })
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao fazer upload" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
