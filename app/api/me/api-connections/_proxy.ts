import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function proxyJson(response: Response) {
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = text ? { error: text } : {}
  }
  return NextResponse.json(data, { status: response.status })
}

export function authHeader(request: Request) {
  return request.headers.get("authorization") || request.headers.get("Authorization")
}

export function backendUrl(path: string) {
  return `${BACKEND}${path}`
}
