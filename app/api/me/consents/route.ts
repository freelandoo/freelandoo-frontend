import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout, readBodyWithTimeout, isFetchTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  try {
    const res = await fetchWithTimeout(
      `${BACKEND}/me/consents`,
      { method: "GET", headers: { Authorization: authHeader }, cache: "no-store" },
      2500,
    )
    const text = await readBodyWithTimeout(res, 1500)
    return Response.json(text ? JSON.parse(text) : { consents: {} }, { status: res.status })
  } catch (e) {
    if (isFetchTimeout(e)) return Response.json({ consents: {}, timeout: true }, { status: 200 })
    return Response.json({ consents: {} }, { status: 200 })
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization")
  if (!authHeader) return Response.json({ error: "Token não fornecido" }, { status: 401 })
  const body = await request.text()
  try {
    const res = await fetchWithTimeout(
      `${BACKEND}/me/consents`,
      {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body,
        cache: "no-store",
      },
      4000,
    )
    const text = await readBodyWithTimeout(res, 2000)
    return Response.json(text ? JSON.parse(text) : {}, { status: res.status })
  } catch (e) {
    if (isFetchTimeout(e)) return Response.json({ error: "timeout" }, { status: 504 })
    return Response.json({ error: "Erro de conexão" }, { status: 500 })
  }
}
