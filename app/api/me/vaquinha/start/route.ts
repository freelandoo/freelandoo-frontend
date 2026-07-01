import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Cria-ou-abre a vaquinha do usuário (nasce ativa com placeholders, editável na página).
export async function POST(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const res = await fetch(`${BACKEND}/me/vaquinha/start`, {
    method: "POST",
    headers: { Authorization: auth },
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
