import { getBackendApiUrl } from "@/lib/backend"

const BACKEND = getBackendApiUrl()

/**
 * Proxy para os endpoints públicos/usuário da Manifestação.
 * `authRequired: false` libera rotas públicas (catálogo) sem token.
 */
export async function proxyManifestations(
  request: Request,
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  { authRequired = true }: { authRequired?: boolean } = {},
) {
  const auth = request.headers.get("Authorization")
  if (authRequired && !auth) {
    return Response.json({ error: "Token não fornecido" }, { status: 401 })
  }
  const body = method === "GET" ? undefined : await request.text()
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (auth) headers.Authorization = auth
  const res = await fetch(`${BACKEND}${path}`, { method, headers, body, cache: "no-store" })
  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text }
  }
  return Response.json(data, { status: res.status })
}
