import { getBackendApiUrl } from "@/lib/backend"

// Segurança A4 (CSP): leitura dos relatórios de violação agregados (back GET /admin/csp-reports).
export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Autorização necessária" }, { status: 401 })
  const res = await fetch(`${getBackendApiUrl()}/admin/csp-reports${new URL(request.url).search}`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({ error: "Resposta inválida" }))
  return Response.json(data, { status: res.status })
}
