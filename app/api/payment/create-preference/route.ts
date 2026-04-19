import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function POST(request: NextRequest) {
  const log = apiFlow("payment/create-preference")
  let status = 500
  log.start(request)
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader) {
      status = 401
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/payments/activation`
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
    })

    log.backendFetch("POST", url, response.status)

    if (!response.ok) {
      status = 500
      throw new Error(`Backend error: ${response.status}`)
    }

    const data = await response.json()
    status = 200
    return NextResponse.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro ao criar preferência de pagamento" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
