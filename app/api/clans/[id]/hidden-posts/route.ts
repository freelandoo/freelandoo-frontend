import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
  }
  const { id } = await params
  const response = await fetch(
    `${BACKEND}/clans/${encodeURIComponent(id)}/hidden-posts`,
    { method: "GET", headers: { Authorization: auth }, cache: "no-store" }
  )
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = text ? { error: text } : {}
  }
  return NextResponse.json(data, { status: response.status })
}
