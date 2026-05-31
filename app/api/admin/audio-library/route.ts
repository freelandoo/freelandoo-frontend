import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export const dynamic = "force-dynamic"

async function proxy(req: NextRequest, method: "GET" | "POST") {
  const qs = method === "GET" ? req.nextUrl.search || "" : ""
  const url = `${BACKEND_URL}/admin/audio-library${qs}`
  const headers: Record<string, string> = {}
  const auth = req.headers.get("authorization")
  if (auth) headers.authorization = auth

  const contentType = req.headers.get("content-type") || ""
  let body: BodyInit | undefined
  if (method === "POST") {
    if (contentType.includes("multipart/form-data")) {
      body = req.body as unknown as BodyInit
      headers["content-type"] = contentType
    } else {
      const text = await req.text()
      body = text
      headers["content-type"] = contentType || "application/json"
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    // @ts-expect-error duplex requerido p/ enviar stream de upload
    duplex: "half",
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  })
}

export async function GET(req: NextRequest) {
  return proxy(req, "GET")
}

export async function POST(req: NextRequest) {
  return proxy(req, "POST")
}
