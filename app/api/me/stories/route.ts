import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export const runtime = "nodejs"
export const maxDuration = 60

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("me/stories:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const qs = searchParams.toString()
    const url = `${BACKEND}/me/stories${qs ? `?${qs}` : ""}`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      cache: "no-store",
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
    return Response.json({ error: "Erro ao listar stories" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function POST(request: Request) {
  const log = apiFlow("me/stories:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }
    const contentType = request.headers.get("content-type") || ""
    const url = `${BACKEND}/me/stories`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": contentType,
      },
      // Stream o corpo bruto preservando o boundary original — evita o
      // roundtrip via FormData() que pode perder o stream do arquivo.
      body: request.body,
      // @ts-expect-error duplex é exigido pelo undici para body streams
      duplex: "half",
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
    const msg = error instanceof Error ? error.message : "desconhecido"
    return Response.json({ error: `Erro ao criar story: ${msg}` }, { status: 500 })
  } finally {
    log.end(status)
  }
}
