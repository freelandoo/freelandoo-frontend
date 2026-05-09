import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token nao fornecido" }, { status: 401 })
  const response = await fetch(`${getBackendApiUrl()}/manifestations/me`, {
    headers: { Authorization: auth },
    cache: "no-store",
  })
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = { error: text }
  }
  return Response.json(data, { status: response.status })
}
