import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { isFetchTimeout, fetchWithTimeout } from "@/lib/server-fetch"

// Disponibilidade do CPF no cadastro (irmão do /api/check-username). O CPF vai
// só na querystring do backend, nunca para log: o apiFlow registra a URL, então
// a chamada ao backend é logada sem o parâmetro.
export async function GET(request: Request) {
  const log = apiFlow("check-cpf")
  let status = 500
  log.start(request)
  try {
    const cpf = new URL(request.url).searchParams.get("cpf") ?? ""
    const base = `${getBackendApiUrl()}/auth/check-cpf`
    const response = await fetchWithTimeout(`${base}?cpf=${encodeURIComponent(cpf)}`, { method: "GET" }, 5000)

    log.backendFetch("GET", base, response.status)

    const data = await response.json()
    status = response.ok ? 200 : response.status
    return Response.json(data, { status })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return Response.json({ available: false, error: "Verificação demorou para responder." }, { status: 504 })
    }
    status = 500
    return Response.json({ available: false, error: "Erro ao verificar CPF" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
