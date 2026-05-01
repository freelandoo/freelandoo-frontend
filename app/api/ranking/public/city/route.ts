import { getBackendApiUrl } from "@/lib/backend"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const qs = new URLSearchParams()
    const municipio = searchParams.get("municipio")
    const estado = searchParams.get("estado")
    const limit = searchParams.get("limit") ?? "10"
    if (!municipio || !estado) {
      return Response.json({ error: "municipio e estado obrigatórios" }, { status: 400 })
    }
    qs.set("municipio", municipio)
    qs.set("estado", estado)
    qs.set("limit", limit)

    const res = await fetch(`${getBackendApiUrl()}/ranking/public/city?${qs.toString()}`)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar ranking por cidade" }, { status: 500 })
  }
}
