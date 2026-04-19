import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const urlMe = () => `${getBackendApiUrl()}/users/me`

export async function GET(request: Request) {
  const log = apiFlow("users/me:GET")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = urlMe()
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    })

    log.backendFetch("GET", url, response.status)

    const data = await response.json()

    if (!response.ok) {
      status = response.status
      return Response.json(data, { status: response.status })
    }

    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao buscar perfil do usuário" }, { status: 500 })
  } finally {
    log.end(status)
  }
}

export async function PUT(request: Request) {
  const log = apiFlow("users/me:PUT")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader) {
      status = 401
      return Response.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json()
    const url = urlMe()
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    log.backendFetch("PUT", url, response.status)

    const data = await response.json()

    if (!response.ok) {
      status = response.status
      return Response.json(data, { status: response.status })
    }

    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ error: "Erro ao atualizar perfil do usuário" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
