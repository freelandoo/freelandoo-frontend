import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

export const dynamic = "force-dynamic"

async function proxy(req: NextRequest, method: "PUT" | "DELETE", id: string) {
  const url = `${BACKEND_URL}/admin/audio-library/${id}`
  const headers: Record<string, string> = {}
  const auth = req.headers.get("authorization")
  if (auth) headers.authorization = auth

  const contentType = req.headers.get("content-type") || ""
  let body: BodyInit | undefined
  if (method === "PUT") {
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
    // @ts-expect-error duplex requerido p/ stream
    duplex: "half",
    cache: "no-store",
  })
  const data = await res.text()
  return new NextResponse(data, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, "PUT", id)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxy(req, "DELETE", id)
}
