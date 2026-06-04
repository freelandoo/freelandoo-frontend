import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request) {
  const log = apiFlow("admin/blog/posts:GET")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const incoming = new URL(request.url)
    const qs = incoming.search ? incoming.search : ""
    const url = `${getBackendApiUrl()}/admin/blog/posts${qs}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: auth, "Content-Type": "application/json" },
    })
    log.backendFetch("GET", url, response.status)
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

export async function POST(request: Request) {
  const log = apiFlow("admin/blog/posts:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const formData = await request.formData()
    const backendForm = new FormData()
    formData.forEach((value, key) => backendForm.append(key, value as Blob | string))
    const url = `${getBackendApiUrl()}/admin/blog/posts`
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth },
      body: backendForm,
    })
    log.backendFetch("POST", url, response.status)
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
