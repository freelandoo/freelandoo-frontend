import { getBackendApiUrl } from "@/lib/backend"

/**
 * Proxy catch-all para o admin da Casa Views (/admin/casa/* no backend).
 * Encaminha método, querystring, body (JSON ou multipart) e o header de auth.
 * Um único arquivo cobre participantes, blocos editoriais e produtos — evita
 * o conflito de params dinâmicos ([id] vs [itemId]) no mesmo nível de app/api.
 */
async function forward(request: Request, path: string[], method: string) {
  const auth = request.headers.get("Authorization")
  if (!auth) return Response.json({ error: "Token não fornecido" }, { status: 401 })

  const search = new URL(request.url).search
  const url = `${getBackendApiUrl()}/admin/casa/${path.join("/")}${search}`

  const headers: Record<string, string> = { Authorization: auth }
  let body: BodyInit | undefined

  if (method !== "GET" && method !== "DELETE") {
    const contentType = request.headers.get("content-type") || ""
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const backendForm = new FormData()
      formData.forEach((value, key) => backendForm.append(key, value as Blob | string))
      body = backendForm
      // não setar Content-Type: o fetch define o boundary do multipart
    } else {
      headers["Content-Type"] = "application/json"
      body = await request.text()
    }
  }

  const response = await fetch(url, { method, headers, body, cache: "no-store" })
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text }
  }
  return Response.json(data, { status: response.status })
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path, "GET")
}
export async function POST(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path, "POST")
}
export async function PUT(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path, "PUT")
}
export async function DELETE(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await params).path, "DELETE")
}
