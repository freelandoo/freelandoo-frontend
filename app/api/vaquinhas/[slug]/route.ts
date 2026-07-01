import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = request.headers.get("Authorization")
  const res = await fetch(`${BACKEND}/vaquinhas/${encodeURIComponent(slug)}`, {
    headers: auth ? { Authorization: auth } : undefined,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
