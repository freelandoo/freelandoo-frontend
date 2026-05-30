import { NextResponse } from "next/server"

/**
 * Proxy server-side do ranking da Casa Views. Lê RANKING_API_URL (env só do
 * servidor — default = serviço Railway atual) e devolve o array de usuários do
 * backend de ranking. Mantém a URL do backend fora do browser: o cliente só vê
 * a mesma origem (freelandoo.com.br/api/acasaviews/rankings).
 *
 * Este route handler tem precedência sobre o rewrite genérico /api/:path* do
 * next.config (afterFiles), então não é encaminhado ao backend do Freelandoo.
 */
export const dynamic = "force-dynamic"

const RANKING_API_URL =
  process.env.RANKING_API_URL?.trim() ||
  "https://casa-views-ranking-production.up.railway.app"

export async function GET() {
  try {
    const res = await fetch(`${RANKING_API_URL.replace(/\/$/, "")}/users`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json([], { status: 200 })
    const data = (await res.json()) as unknown
    return NextResponse.json(Array.isArray(data) ? data : [], {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
