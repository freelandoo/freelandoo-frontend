import { forwardToBackend } from "@/lib/api-proxy"

type Ctx = { params: Promise<{ slug: string }> }

// Abre o checkout mensal (Stripe) do plano. O corpo leva `return_to` — o
// caminho relativo para onde o Stripe devolve a pessoa depois de pagar.
export async function POST(request: Request, ctx: Ctx) {
  const { slug } = await ctx.params
  return forwardToBackend(request, "POST", `/plans/${encodeURIComponent(slug)}/checkout`)
}
