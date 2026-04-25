import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: NextRequest) {
  const log = apiFlow("stripe/subscription/create-session")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      status = 401
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const url = `${getBackendApiUrl()}/stripe/subscription/checkout`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body || {}),
    })

    log.backendFetch("POST", url, response.status)
    const data = await response.json().catch(() => ({}))
    status = response.status
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
