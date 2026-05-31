import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export const dynamic = "force-dynamic"

// Público (autenticado): picker de música do composer.
export async function GET(req: NextRequest) {
  const qs = req.nextUrl.search || ""
  const headers: Record<string, string> = {}
  const auth = req.headers.get("authorization")
  if (auth) headers.authorization = auth
  const res = await fetch(`${BACKEND_URL}/audio-library${qs}`, { headers, cache: "no-store" })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  })
}
