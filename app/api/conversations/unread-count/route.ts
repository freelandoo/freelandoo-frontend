import { NextResponse } from "next/server"
import { authHeader, backendUrl } from "../_proxy"
import { isFetchTimeout, fetchWithTimeout, readBodyWithTimeout } from "@/lib/server-fetch"

const EMPTY = { total: 0, by_actor: [] }

export async function GET(request: Request) {
  const auth = authHeader(request)
  if (!auth) {
    return NextResponse.json(EMPTY, { status: 200 })
  }
  try {
    const response = await fetchWithTimeout(backendUrl("/conversations/unread-count"), {
      method: "GET",
      headers: { Authorization: auth },
      cache: "no-store",
    }, 2500)
    let data: unknown = EMPTY
    try {
      const text = await readBodyWithTimeout(response, 1500)
      if (text) data = JSON.parse(text)
    } catch {
      data = { ...EMPTY, timeout: true }
    }
    return NextResponse.json(data, { status: response.ok ? response.status : 200 })
  } catch (error) {
    if (isFetchTimeout(error)) {
      return NextResponse.json({ ...EMPTY, timeout: true }, { status: 200 })
    }
    return NextResponse.json(EMPTY, { status: 500 })
  }
}
