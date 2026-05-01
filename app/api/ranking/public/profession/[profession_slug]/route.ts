import { getBackendApiUrl } from "@/lib/backend"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profession_slug: string }> }
) {
  try {
    const { profession_slug } = await params
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get("limit") ?? "10"

    const res = await fetch(
      `${getBackendApiUrl()}/ranking/public/profession/${encodeURIComponent(
        profession_slug
      )}?limit=${limit}`
    )
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch {
    return Response.json({ error: "Erro ao buscar ranking por profissão" }, { status: 500 })
  }
}
