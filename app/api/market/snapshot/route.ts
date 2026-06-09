import { NextResponse } from "next/server"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchWithTimeout } from "@/lib/server-fetch"

const BACKEND = getBackendApiUrl()

// Snapshot de mercado (ações/cotações/notícias). Público e cacheável: o backend
// já serve de um cache atualizado por scheduler, então aqui aplicamos cache de
// borda forte (s-maxage) pra que o Vercel sirva a maioria dos hits sem invocar a
// lambda nem o backend a cada request. revalidate de 5 min acompanha o snapshot.
export const revalidate = 300

export async function GET() {
  try {
    const response = await fetchWithTimeout(
      `${BACKEND}/market/snapshot`,
      { method: "GET", next: { revalidate: 300 } },
      8000
    )
    const data = await response.json().catch(() => null)
    return NextResponse.json(data ?? { quotes: [], stocks: [], news: [] }, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    })
  } catch {
    return NextResponse.json(
      { quotes: [], stocks: [], news: [] },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=60" } }
    )
  }
}
