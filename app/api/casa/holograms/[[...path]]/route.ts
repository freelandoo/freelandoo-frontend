import { forwardToBackend } from "@/lib/api-proxy"

/**
 * Proxy dos hologramas da aba RA da Casa Views (mig 274):
 * `/api/casa/holograms[/*]` → `/casa/holograms[/*]`. Tudo exige login.
 */
type Ctx = { params: Promise<{ path?: string[] }> }

const backendPath = (parts: string[] = []) =>
  `/casa/holograms${parts.length ? `/${parts.map(encodeURIComponent).join("/")}` : ""}`

export async function GET(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forwardToBackend(request, "GET", backendPath(path))
}

export async function POST(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forwardToBackend(request, "POST", backendPath(path))
}
