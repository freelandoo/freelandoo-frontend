import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

const FORWARDED = [
  "id_machine",
  "id_category",
  "estado",
  "municipio",
  "exclude_ids",
  "cursor",
  "limit",
] as const

export async function GET(request: Request) {
  const log = apiFlow("feed.portfolio")
  let status = 500
  log.start(request)
  try {
    const { searchParams } = new URL(request.url)

    const params = new URLSearchParams()
    for (const key of FORWARDED) {
      const value = searchParams.get(key)
      if (value) params.append(key, value)
    }

    const queryString = params.toString()
    const url = `${getBackendApiUrl()}/feed/portfolio${queryString ? `?${queryString}` : ""}`

    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const auth = request.headers.get("Authorization")
    if (auth) headers["Authorization"] = auth

    const response = await fetch(url, { method: "GET", headers, cache: "no-store" })
    log.backendFetch("GET", url, response.status)

    const data = await response.json().catch(() => ({}))
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error)
    return Response.json(
      { error: "Erro ao carregar feed", details: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    )
  } finally {
    log.end(status)
  }
}
