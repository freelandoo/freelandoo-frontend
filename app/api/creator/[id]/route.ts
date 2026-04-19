import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const log = apiFlow("creator/[id]")
  let status = 500
  log.start(request)
  try {
    const { id } = await params
    const url = `${getBackendApiUrl()}/profile/${id}`
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      await response.text()
      status = response.status
      return NextResponse.json({ error: "Creator não encontrado" }, { status: response.status })
    }

    const data = await response.json()
    status = 200
    return NextResponse.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
