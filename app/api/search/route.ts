import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export async function GET(request: Request) {
  const log = apiFlow("search")
  let status = 500
  log.start(request)
  try {
    const { searchParams } = new URL(request.url)

    const params = new URLSearchParams()

    if (searchParams.get("estado")) params.append("estado", searchParams.get("estado")!)
    if (searchParams.get("municipio")) params.append("municipio", searchParams.get("municipio")!)
    if (searchParams.get("platform")) params.append("platform", searchParams.get("platform")!)
    if (searchParams.get("category")) params.append("category", searchParams.get("category")!)
    if (searchParams.get("categories")) params.append("categories", searchParams.get("categories")!)
    if (searchParams.get("id_machine")) params.append("id_machine", searchParams.get("id_machine")!)
    if (searchParams.get("id_category")) params.append("id_category", searchParams.get("id_category")!)
    if (searchParams.get("machine_slug")) params.append("machine_slug", searchParams.get("machine_slug")!)
    if (searchParams.get("q")) params.append("q", searchParams.get("q")!)

    const queryString = params.toString()
    const url = `${getBackendApiUrl()}/search${queryString ? `?${queryString}` : ""}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      const errorText = await response.text()
      status = response.status
      return Response.json({ error: "Erro ao buscar creators", details: errorText }, { status: response.status })
    }

    const data = await response.json()

    status = 200
    return Response.json(data)
  } catch (error) {
    log.fail(error)
    status = 500
    return Response.json(
      { error: "Erro ao buscar creators", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 },
    )
  } finally {
    log.end(status)
  }
}
