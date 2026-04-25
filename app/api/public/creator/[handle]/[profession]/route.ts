import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { stripHandlePrefix } from "@/lib/slug"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string; profession: string }> }
) {
  const log = apiFlow("public/creator/[handle]/[profession]")
  let status = 500
  log.start(request)
  try {
    const { handle, profession } = await params
    const cleanHandle = stripHandlePrefix(decodeURIComponent(handle))
    const cleanProfession = decodeURIComponent(profession)

    const url = `${getBackendApiUrl()}/public/creator/${encodeURIComponent(
      cleanHandle
    )}/${encodeURIComponent(cleanProfession)}`

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    })

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      await response.text()
      status = response.status
      return NextResponse.json(
        { error: "Perfil não encontrado" },
        { status: response.status }
      )
    }

    const data = await response.json()
    status = 200
    return NextResponse.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    )
  } finally {
    log.end(status)
  }
}
