import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: NextRequest) {
  const log = apiFlow("payments/history")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      status = 401
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/payments/history`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      await response.text()
      status = 500
      throw new Error(`Backend retornou: ${response.status}`)
    }

    const data = await response.json()
    status = 200
    return NextResponse.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro ao carregar histórico de pagamentos" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
