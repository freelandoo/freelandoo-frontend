import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("admin/store/product-categories:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${backend()}/admin/store/product-categories`
    const response = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao listar categorias" }, { status: 500 })
  } finally { log.end(status) }
}

export async function POST(request: Request) {
  const log = apiFlow("admin/store/product-categories:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const body = await request.json()
    const url = `${backend()}/admin/store/product-categories`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao criar categoria" }, { status: 500 })
  } finally { log.end(status) }
}
