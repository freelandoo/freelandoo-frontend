import { getBackendApiUrl } from "@/lib/backend"

const FORWARDED = ["kind", "page", "per_page"] as const

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization")
    if (!auth) return Response.json({ error: "Autorizacao necessaria" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const qs = new URLSearchParams()
    for (const key of FORWARDED) {
      const v = searchParams.get(key)
      if (v) qs.append(key, v)
    }
    const url = `${getBackendApiUrl()}/me/bookmarks${qs.toString() ? `?${qs}` : ""}`

    const res = await fetch(url, {
      method: "GET",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao listar salvos" }, { status: 500 })
  }
}
