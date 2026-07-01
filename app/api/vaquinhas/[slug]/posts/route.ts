import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const url = new URL(request.url)
  const qs = url.search
  const res = await fetch(`${BACKEND}/vaquinhas/${encodeURIComponent(slug)}/posts${qs}`, { cache: "no-store" })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
