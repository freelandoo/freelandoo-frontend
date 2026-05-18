import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const BASE_URL = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("countries")
  let status = 500
  log.start(request)
  try {
    const url = `${BASE_URL}/countries`
    const response = await fetch(url, {
      // Catálogo muda raramente — cache leve de 5min em edge.
      next: { revalidate: 300 },
    })

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      status = response.status
      return NextResponse.json({ error: "Erro ao buscar países" }, { status: response.status })
    }

    const data = await response.json()
    status = 200
    return NextResponse.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  } finally {
    log.end(status)
  }
}
