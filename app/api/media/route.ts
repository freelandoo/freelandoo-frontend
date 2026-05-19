import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { fetchWithTimeout, isFetchTimeout } from "@/lib/server-fetch"

const base = () => getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("media:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${base()}/users/me/media`
    const response = await fetchWithTimeout(
      url,
      { method: "GET", headers: { Authorization: authHeader } },
      4000
    )

    log.backendFetch("GET", url, response.status)

    const text = await response.text()

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao listar mídia" }
      }
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    const data = text ? JSON.parse(text) : []
    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json([], { status: 200 })
    }
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao listar mídia" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}

export async function POST(request: Request) {
  const log = apiFlow("media:POST")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json()
    const url = `${base()}/users/me/media`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    log.backendFetch("POST", url, response.status)

    const text = await response.text()

    if (!response.ok) {
      let errorData
      try {
        errorData = JSON.parse(text)
      } catch {
        errorData = { error: text || "Erro ao criar item de mídia" }
      }
      status = response.status
      return Response.json(errorData, { status: response.status })
    }

    const data = text ? JSON.parse(text) : { success: true }
    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao criar item de mídia" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
