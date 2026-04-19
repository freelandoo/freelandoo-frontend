import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: Request) {
  const log = apiFlow("reset-password")
  let status = 500
  log.start(request)
  try {
    const body = await request.json()

    const payload = {
      token: body.token,
      novaSenha: body.password,
    }

    const url = `${getBackendApiUrl()}/auth/reset-password`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    log.backendFetch("POST", url, response.status)

    const data = await response.json()

    if (!response.ok) {
      status = response.status
      return Response.json(
        { message: data.message || data.error || "Erro ao redefinir senha" },
        { status: response.status },
      )
    }

    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json({ message: "Erro ao conectar com o servidor" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
