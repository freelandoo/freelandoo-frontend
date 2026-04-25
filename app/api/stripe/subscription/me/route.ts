import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: NextRequest) {
  const log = apiFlow("stripe/subscription/me")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      status = 401
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/stripe/subscription/me`
    const response = await fetch(url, {
      headers: { Authorization: authHeader },
    })
    log.backendFetch("GET", url, response.status)

    const data = await response.json().catch(() => ({}))
    status = response.status
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro ao consultar assinatura" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
