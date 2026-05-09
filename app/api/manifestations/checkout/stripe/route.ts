import { getBackendApiUrl } from "@/lib/backend"

export async function POST(request: Request) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token nao fornecido" }, { status: 401 })
  const body = await request.text()
  const response = await fetch(`${getBackendApiUrl()}/manifestations/checkout/stripe`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body,
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
