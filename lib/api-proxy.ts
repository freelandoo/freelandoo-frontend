import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"

/**
 * Encaminhamento simples para o backend, para os proxies que são só isso: passa
 * o Authorization adiante e devolve o JSON com o mesmo status.
 *
 * Existe porque as rotas de pet/carro/games (mig 210) são sete arquivos que
 * fariam a MESMA coisa — e sete cópias da mesma função é como nasce a que
 * esquece de repassar o header.
 *
 * Só para chamadas pontuais (abrir um menu, enviar um cadastro). Chamada
 * RECORRENTE do browser não passa por aqui: vai direto no Railway via
 * `getPublicBackendUrl()`, senão cada batida vira invocação cobrada na Vercel.
 */
export async function forwardToBackend(
  request: Request,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  { requireAuth = true }: { requireAuth?: boolean } = {},
) {
  const auth =
    request.headers.get("authorization") || request.headers.get("Authorization")
  if (requireAuth && !auth) {
    return NextResponse.json({ error: "Autorização necessária" }, { status: 401 })
  }

  const incoming = new URL(request.url)
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
  }
  if (method === "POST" || method === "PATCH") {
    const text = await request.text()
    if (text) init.body = text
  }

  try {
    const response = await fetch(
      `${getBackendApiUrl()}${path}${incoming.search}`,
      init,
    )
    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text }
    }
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ error: "Falha ao falar com o servidor." }, { status: 502 })
  }
}
