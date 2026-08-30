import { forwardToBackend } from "@/lib/api-proxy"

type Ctx = { params: Promise<{ brand_code: string }> }

export async function GET(request: Request, ctx: Ctx) {
  const { brand_code } = await ctx.params
  return forwardToBackend(
    request,
    "GET",
    `/cars/brands/${encodeURIComponent(brand_code)}/models`,
  )
}
