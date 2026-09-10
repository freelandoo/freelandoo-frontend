import { NextResponse } from "next/server"
import { forwardToBackend } from "@/lib/api-proxy"
import { getBackendApiUrl } from "@/lib/backend"

// A foto de alguém DENTRO de uma plataforma (mig 233): games e Financeiro.
//
// Ausência de override no backend é "usa o rosto de sempre" — o GET devolve
// `{ avatar_url: null, is_override: false }` e o headcard cai em `perfil.avatar`.
// Voltar a herdar é o DELETE, que responde OK mesmo sem nada a apagar.
//
// ⚠️ `kind` chega da URL e é o backend quem o confere contra a lista fechada
// (404 fora dela). Aqui só se repassa.

type Ctx = { params: Promise<{ kind: string }> }

export async function GET(request: Request, { params }: Ctx) {
  const { kind } = await params
  return forwardToBackend(request, "GET", `/me/platform-avatar/${encodeURIComponent(kind)}`)
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { kind } = await params
  return forwardToBackend(request, "DELETE", `/me/platform-avatar/${encodeURIComponent(kind)}`)
}

// O PUT é multipart e o `forwardToBackend` só sabe JSON — daí o caminho
// próprio, o mesmo de `users/me/avatar`. O campo é `avatar`, como lá: não há
// dois nomes para o mesmo tipo de envio.
export async function PUT(request: Request, { params }: Ctx) {
  const { kind } = await params
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (!auth) {
    return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("avatar")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não fornecido" }, { status: 400 })
  }

  const body = new FormData()
  body.append("avatar", file)

  try {
    const response = await fetch(
      `${getBackendApiUrl()}/me/platform-avatar/${encodeURIComponent(kind)}`,
      { method: "PUT", headers: { Authorization: auth }, body },
    )
    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text || "Erro ao enviar a foto" }
    }
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Falha ao falar com o servidor." }, { status: 502 })
  }
}
