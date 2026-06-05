import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { fetchWithTimeout, isFetchTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

export async function POST(request: Request) {
  const log = apiFlow("signup")
  let status = 500
  log.start(request)
  try {
    const body = await request.text()
    const url = `${getBackendApiUrl()}/auth/signup`
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body || "{}",
      },
      6000
    )
    log.backendFetch("POST", url, response.status)

    const text = await readBodyWithTimeout(response, 3000)
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: "Resposta invalida do servidor" }
    }

    status = response.status
    return Response.json(data, { status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ error: "Cadastro demorou para responder. Tente novamente." }, { status })
    }
    status = 500
    return Response.json({ error: "Erro ao processar cadastro" }, { status })
  } finally {
    log.end(status)
  }
}
