import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout, isFetchTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { search } = new URL(request.url)

  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/engagement${search}`,
      {
        method: "GET",
        headers: { Authorization: auth },
        cache: "no-store",
      },
      9000
    )
    let data: unknown = null
    try {
      const text = await readBodyWithTimeout(response, 3000)
      if (text) data = JSON.parse(text)
    } catch {
      data = null
    }
    if (!data) {
      return NextResponse.json(
        { error: "no_data" },
        { status: response.ok ? 502 : response.status }
      )
    }
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (error) {
    if (isFetchTimeout(error)) {
      return NextResponse.json({ error: "timeout" }, { status: 504 })
    }
    return NextResponse.json({ error: "upstream_error" }, { status: 502 })
  }
}
