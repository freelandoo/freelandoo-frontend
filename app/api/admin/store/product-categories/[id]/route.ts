import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/store/product-categories/[id]:GET")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${backend()}/admin/store/product-categories/${id}`
    const response = await fetch(url, { headers: { Authorization: authHeader }, cache: "no-store" })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao buscar categoria" }, { status: 500 })
  } finally { log.end(status) }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/store/product-categories/[id]:PUT")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const body = await request.json()
    const url = `${backend()}/admin/store/product-categories/${id}`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    log.backendFetch("PUT", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao atualizar categoria" }, { status: 500 })
  } finally { log.end(status) }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/store/product-categories/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }
    const url = `${backend()}/admin/store/product-categories/${id}`
    const response = await fetch(url, { method: "DELETE", headers: { Authorization: authHeader } })
    log.backendFetch("DELETE", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao remover categoria" }, { status: 500 })
  } finally { log.end(status) }
}
