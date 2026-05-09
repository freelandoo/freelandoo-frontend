import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const search = new URL(request.url).search
  const url = `${getBackendApiUrl()}/polens/history${search}`
  const res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  return Response.json(data, { status: res.status })
}
