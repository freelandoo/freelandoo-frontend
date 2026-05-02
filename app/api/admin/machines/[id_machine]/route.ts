import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id_machine: string }> }
) {
  const log = apiFlow("admin/machines/[id]:PATCH")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_machine } = await params
    const body = await request.text()
    const url = `${getBackendApiUrl()}/admin/machines/${encodeURIComponent(id_machine)}`
    const response = await fetch(url, {
      method: "PATCH",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
    })
    log.backendFetch("PATCH", url, response.status)
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao atualizar máquina" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id_machine: string }> }
) {
  const log = apiFlow("admin/machines/[id]:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id_machine } = await params
    let body = ""
    try {
      body = await request.text()
    } catch {
      body = ""
    }
    const url = `${getBackendApiUrl()}/admin/machines/${encodeURIComponent(id_machine)}`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: body || undefined,
    })
    log.backendFetch("DELETE", url, response.status)
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao excluir máquina" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
