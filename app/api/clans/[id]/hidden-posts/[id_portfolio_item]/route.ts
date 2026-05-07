import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

async function forward(
  request: NextRequest,
  method: "POST" | "DELETE",
  id: string,
  id_portfolio_item: string
) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
  }
  const body = method === "POST" ? await request.text() : undefined
  const response = await fetch(
    `${BACKEND}/clans/${encodeURIComponent(id)}/hidden-posts/${encodeURIComponent(id_portfolio_item)}`,
    {
      method,
      headers: {
        Authorization: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
    }
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; id_portfolio_item: string }> }
) {
  const { id, id_portfolio_item } = await params
  return forward(request, "POST", id, id_portfolio_item)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; id_portfolio_item: string }> }
) {
  const { id, id_portfolio_item } = await params
  return forward(request, "DELETE", id, id_portfolio_item)
}
