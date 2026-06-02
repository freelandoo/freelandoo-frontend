import { NextResponse } from "next/server"

/**
 * Proxy server-side do RANKING GERAL de Participantes da Casa Views.
 * Lê RANKING_API_URL (env só do servidor) e devolve o array `standings` do
 * backend de ranking (/casa/ranking/geral) — soma dos pontos de posição
 * (8/7/6/5/4) acumulados dia a dia. Mantém a URL do backend fora do browser.
 */
export const dynamic = "force-dynamic"

const RANKING_API_URL =
  process.env.RANKING_API_URL?.trim() ||
  "https://casa-views-ranking-production.up.railway.app"

export async function GET() {
  try {
    const res = await fetch(`${RANKING_API_URL.replace(/\/$/, "")}/casa/ranking/geral`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ standings: [] }, { status: 200 })
    const data = (await res.json()) as { standings?: unknown }
    const standings = Array.isArray(data?.standings) ? data.standings : []
    return NextResponse.json(
      { standings },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ standings: [] }, { status: 200 })
  }
}
