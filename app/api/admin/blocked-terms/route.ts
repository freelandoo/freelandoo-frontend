import { getBackendApiUrl } from "@/lib/backend"

const backend = () => getBackendApiUrl()

async function forward(request: Request, method: "GET" | "POST") {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Autorização necessária" }, { status: 401 })
  const url = `${backend()}/admin/blocked-terms${method === "GET" ? new URL(request.url).search : ""}`
  const init: RequestInit = {
    method,
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    cache: "no-store",
  }
  if (method === "POST") init.body = await request.text()
  const res = await fetch(url, init)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export const GET = (r: Request) => forward(r, "GET")
export const POST = (r: Request) => forward(r, "POST")
