import { getBackendApiUrl } from "@/lib/backend"

const backend = () => getBackendApiUrl()

async function forward(request: Request, ctx: { params: Promise<{ id: string }> }, method: "PATCH" | "DELETE") {
  const { id } = await ctx.params
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Autorização necessária" }, { status: 401 })
  const url = `${backend()}/admin/blocked-terms/${encodeURIComponent(id)}`
  const init: RequestInit = {
    method,
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    cache: "no-store",
  }
  if (method === "PATCH") init.body = await request.text()
  const res = await fetch(url, init)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export const PATCH = (r: Request, c: { params: Promise<{ id: string }> }) => forward(r, c, "PATCH")
export const DELETE = (r: Request, c: { params: Promise<{ id: string }> }) => forward(r, c, "DELETE")
