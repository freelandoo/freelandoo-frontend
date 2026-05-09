import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/manifestations/products/[id]:PUT")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id } = await params
    const formData = await request.formData()
    const backendForm = new FormData()
    formData.forEach((value, key) => backendForm.append(key, value as Blob | string))
    const url = `${getBackendApiUrl()}/admin/manifestations/products/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: "PUT",
      headers: { Authorization: auth },
      body: backendForm,
    })
    log.backendFetch("PUT", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("admin/manifestations/products/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id } = await params
    const url = `${getBackendApiUrl()}/admin/manifestations/products/${encodeURIComponent(id)}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch("DELETE", url, response.status)
    const text = await response.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = { error: text } }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
