import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Admin: liga/desliga uma responsabilidade.
export async function PUT(
  request: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const { key } = await ctx.params
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })

  const body = await request.text()
  const res = await fetch(`${BACKEND}/admin/feature-flags/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
}
