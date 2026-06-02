import { NextResponse } from "next/server"

/**
 * Proxy server-side da config da Audiência (data de início). Lê RANKING_API_URL
 * no servidor. GET é público (lê a data atual). POST repassa o Authorization do
 * admin para o módulo de ranking, que valida o admin via Freelandoo.
 */
export const dynamic = "force-dynamic"

const RANKING_API_URL =
  process.env.RANKING_API_URL?.trim() ||
  "https://casa-views-ranking-production.up.railway.app"

const base = () => RANKING_API_URL.replace(/\/$/, "")

export async function GET() {
  try {
    const res = await fetch(`${base()}/casa/settings/audience-start`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ audience_start_date: null }, { status: 200 })
    const data = await res.json()
    return NextResponse.json(
      { audience_start_date: data?.audience_start_date ?? null },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ audience_start_date: null }, { status: 200 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || ""
    const body = await req.json().catch(() => ({}))
    const res = await fetch(`${base()}/casa/settings/audience-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify({ start_date: body?.start_date ?? "" }),
      cache: "no-store",
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 })
  }
}
