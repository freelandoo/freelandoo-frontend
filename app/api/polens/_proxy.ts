import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function proxyPolens(request: Request, path: string, method: "GET" | "POST" | "PUT" = "GET") {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const body = method === "GET" ? undefined : await request.text()
  const url = `${BACKEND}${path}`
  const res = await fetch(url, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  const text = await res.text()
  let data: unknown
  try { data = text ? JSON.parse(text) : null } catch { data = { error: text } }
  return Response.json(data, { status: res.status })
}
