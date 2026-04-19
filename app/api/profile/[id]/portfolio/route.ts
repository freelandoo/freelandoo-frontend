import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("profile/[id]/portfolio:GET")
  let status = 500
  log.start(request)
  try {
    const { id: profileId } = await params
    const url = `${BACKEND}/profile/${profileId}/portfolio`
    const response = await fetch(url)

    log.backendFetch("GET", url, response.status)

    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao buscar portfólio" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("profile/[id]/portfolio:POST")
  let status = 500
  log.start(request)
  try {
    const { id: profileId } = await params
    const body = await request.json()
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }

    const url = `${BACKEND}/profile/${profileId}/portfolio`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
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
    return Response.json({ error: "Erro ao criar item de portfólio" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
