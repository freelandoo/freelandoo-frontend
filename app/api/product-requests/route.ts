import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const backend = () => getBackendApiUrl()

export async function POST(request: Request) {
  const log = apiFlow("product-requests:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) { status = 401; return Response.json({ error: "Autorização necessária" }, { status: 401 }) }

    const contentType = request.headers.get("content-type") || ""
    const url = `${backend()}/product-requests`
    let response: Response
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: authHeader },
        body: form,
      })
    } else {
      const body = await request.text()
      response = await fetch(url, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body,
      })
    }
    log.backendFetch("POST", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao criar pedido" }, { status: 500 })
  } finally { log.end(status) }
}
