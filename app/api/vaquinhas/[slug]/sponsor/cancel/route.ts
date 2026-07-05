import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Cancela o patrocínio mensal do próprio user (bolsa).
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = request.headers.get("Authorization")
  const res = await fetch(`${BACKEND}/vaquinhas/${encodeURIComponent(slug)}/sponsor/cancel`, {
    method: "POST",
    headers: auth ? { Authorization: auth } : undefined,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
