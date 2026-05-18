import { NextResponse } from "next/server"

// Diagnóstico — não toca backend. Se isso pendurar, problema é plataforma.
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() })
}
