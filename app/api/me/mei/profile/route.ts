import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// Salva os dados fiscais do prestador (+ flag is_mei / lembrete DAS).
export async function PUT(request: Request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

  const body = await request.text()
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/me/mei/profile`,
      {
        method: "PUT",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body,
        cache: "no-store",
      },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { error: "Falha ao salvar" }, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Falha de rede" }, { status: 502 })
  }
}
