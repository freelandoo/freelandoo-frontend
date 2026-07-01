import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Doação: auth opcional (doador pode estar deslogado → doação anônima).
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const auth = request.headers.get("Authorization")
  const body = await request.text()
  const res = await fetch(`${BACKEND}/vaquinhas/${encodeURIComponent(slug)}/donate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    body,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
