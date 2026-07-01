import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const res = await fetch(`${BACKEND}/me/vaquinha`, { headers: { Authorization: auth }, cache: "no-store" })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const body = await request.text()
  const res = await fetch(`${BACKEND}/me/vaquinha`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
