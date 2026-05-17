import { getBackendApiUrl } from "@/lib/backend"
import { apiFlow } from "@/lib/api-logger"

export const revalidate = 60

export async function GET(request: Request, ctx: { params: Promise<{ code: string }> }) {
  const log = apiFlow("public/coupon:GET")
  let status = 500
  log.start(request)
  try {
    const { code } = await ctx.params
    const url = `${getBackendApiUrl()}/public/coupon/${encodeURIComponent(code)}`
    const response = await fetch(url, { next: { revalidate: 60 } })
    log.backendFetch("GET", url, response.status)
    const data = await response.json()
    status = response.status
    return Response.json(data, { status: response.status })
  } catch (error) {
    log.fail(error); status = 500
    return Response.json({ error: "Erro ao validar cupom" }, { status: 500 })
  } finally { log.end(status) }
}
