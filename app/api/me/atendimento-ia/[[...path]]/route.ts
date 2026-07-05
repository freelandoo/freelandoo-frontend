import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Proxy do Atendimento IA (vendedor): GET /, POST /checkout, PATCH /config,
// POST /cancel. Catch-all opcional cobre a raiz e os subcaminhos.
async function forward(request: Request, method: string, pathParts: string[]) {
  const sub = pathParts.length ? `/${pathParts.join("/")}` : ""
  const auth = request.headers.get("Authorization")
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: auth } : {}),
    },
    cache: "no-store",
  }
  if (method === "POST" || method === "PATCH") {
    const text = await request.text()
    if (text) init.body = text
  }
  const res = await fetch(`${BACKEND}/me/atendimento-ia${sub}`, init)
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}

type Ctx = { params: Promise<{ path?: string[] }> }

export async function GET(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "GET", path || [])
}
export async function POST(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "POST", path || [])
}
export async function PATCH(request: Request, ctx: Ctx) {
  const { path } = await ctx.params
  return forward(request, "PATCH", path || [])
}
