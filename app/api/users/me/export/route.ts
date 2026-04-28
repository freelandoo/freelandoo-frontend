import { NextRequest, NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Token não fornecido" }, { status: 401 })
    }

    const url = `${getBackendApiUrl()}/users/me/export`
    const response = await fetch(url, {
      method: "GET",
      headers: { Authorization: authHeader },
    })

    const data = await response.json().catch(() => ({ error: "Resposta inválida do backend" }))

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="freelandoo-meus-dados.json"`,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: "Erro ao exportar dados", detail: msg }, { status: 500 })
  }
}
