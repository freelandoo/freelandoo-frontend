import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("me/portfolio:GET")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const url = `${BACKEND}/me/portfolio`
    const response = await fetch(url, { headers: { Authorization: auth } })
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

export async function POST(request: Request) {
  const log = apiFlow("me/portfolio:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const body = await request.json()
    const url = `${BACKEND}/me/portfolio`
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
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
