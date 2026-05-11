import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

// Upload da capa do curso (banner hero da landing). Stream do multipart
// direto pro backend, mesmo padrão do video/route.ts.
export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = apiFlow("me/courses/[id]/cover:POST")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id } = await params
    const url = `${getBackendApiUrl()}/me/courses/${encodeURIComponent(id)}/cover`

    const contentType = request.headers.get("content-type") || ""
    const contentLength = request.headers.get("content-length")
    const headers: Record<string, string> = {
      Authorization: auth,
      "Content-Type": contentType,
    }
    if (contentLength) headers["Content-Length"] = contentLength

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: request.body,
      // @ts-expect-error duplex é exigido em runtime mas falta no DOM lib
      duplex: "half",
    })
    log.backendFetch("POST", url, response.status)
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
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const log = apiFlow("me/courses/[id]/cover:DELETE")
  let status = 500
  log.start(request)
  try {
    const auth = request.headers.get("Authorization")
    if (!auth) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { id } = await params
    const url = `${getBackendApiUrl()}/me/courses/${encodeURIComponent(id)}/cover`
    const response = await fetch(url, {
      method: "DELETE",
      headers: { Authorization: auth },
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
    return Response.json({ error: "Erro" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
