import { type NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: NextRequest) {
  const log = apiFlow("activate")
  let status = 500
  log.start(request)
  try {
    const token = request.nextUrl.searchParams.get("token")

    if (!token) {
      status = 400
      return NextResponse.json({ message: "Token não fornecido" }, { status: 400 })
    }

    const url = `${getBackendApiUrl()}/auth/activate?token=${encodeURIComponent(token)}`
    const response = await fetch(url, {
      method: "GET",
    })

    log.backendFetch("GET", url, response.status)

    const data = await response.json()

    if (!response.ok) {
      status = response.status
      return NextResponse.json({ message: data.message || "Erro ao ativar conta" }, { status: response.status })
    }

    status = 200
    return NextResponse.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ message: "Erro ao conectar com o servidor" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
