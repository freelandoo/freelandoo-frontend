import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
    }
    const { id } = await params
    const response = await fetch(`${BACKEND}/clans/messages/${id}`, {
      method: "DELETE",
      headers: { Authorization: authHeader },
    })
    const text = await response.text()
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao apagar mensagem", detail: msg }, { status: 500 })
  }
}
