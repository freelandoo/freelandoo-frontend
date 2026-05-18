import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"
import { fetchWithTimeout, readBodyWithTimeout, isFetchTimeout } from "@/lib/server-fetch"

const BASE_URL = getBackendApiUrl()

export async function GET(request: Request) {
  const log = apiFlow("countries")
  let status = 500
  log.start(request)
  try {
    const url = `${BASE_URL}/countries`
    const response = await fetchWithTimeout(url, { method: "GET" }, 4000)

    log.backendFetch("GET", url, response.status)

    if (!response.ok) {
      status = response.status
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      })
    }

    let data: unknown = []
    try {
      const text = await readBodyWithTimeout(response, 2000)
      if (text) data = JSON.parse(text)
    } catch {
      data = []
    }
    status = 200
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    })
  } catch (error) {
    log.fail(error)
    if (isFetchTimeout(error)) {
      status = 504
      return NextResponse.json([], { status: 200 })
    }
    status = 500
    return NextResponse.json([], { status: 200 })
  } finally {
    log.end(status)
  }
}
