import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

// Cria um post da vaquinha. Repassa o multipart (campo "media") pro backend.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })

  const form = await request.formData()
  const res = await fetch(`${BACKEND}/me/vaquinha/${encodeURIComponent(id)}/posts`, {
    method: "POST",
    headers: { Authorization: auth },
    body: form,
    cache: "no-store",
  })
  const text = await res.text()
  return new Response(text || "{}", { status: res.status, headers: { "Content-Type": "application/json" } })
}
