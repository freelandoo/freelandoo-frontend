import { getBackendApiUrl } from "@/lib/backend"

/**
 * Proxy do checkout da Conveniência Views. Exige auth (identidade Freelandoo)
 * e encaminha pro backend core /casa/checkout, que cria a sessão Stripe.
 */
export async function POST(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  try {
    const body = await request.text()
    const res = await fetch(`${getBackendApiUrl()}/casa/checkout`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body,
      cache: "no-store",
    })
    const text = await res.text()
    let data: unknown
    try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao iniciar compra" }, { status: 500 })
  }
}
