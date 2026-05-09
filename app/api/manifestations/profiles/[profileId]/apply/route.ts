import { getBackendApiUrl } from "@/lib/backend"

export async function PUT(request: Request, { params }: { params: Promise<{ profileId: string }> }) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token nao fornecido" }, { status: 401 })
  const { profileId } = await params
  const body = await request.text()
  const response = await fetch(`${getBackendApiUrl()}/manifestations/profiles/${encodeURIComponent(profileId)}/apply`, {
    method: "PUT",
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
