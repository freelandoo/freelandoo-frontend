import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

/**
 * Proxy para GET /stripe/subscription/me
 * Mantém a rota /api/payments/history como redirect interno para compatibilidade.
 */
export async function GET(request: NextRequest) {
  const log = apiFlow("payments/history→stripe/subscription/me")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      status = 401
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/stripe/subscription/me`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    log.backendFetch("GET", url, response.status)

    const data = await response.json().catch(() => ({}))
    status = response.status
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro ao carregar dados de ativação" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
