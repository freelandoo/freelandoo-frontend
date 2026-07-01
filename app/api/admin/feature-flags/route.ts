import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Admin: lista completa das flags para o Painel de Controle.
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

  const res = await fetch(`${BACKEND}/admin/feature-flags`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
