import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

/** Log de entrada para todas as rotas `/api/*` (path sem query). */
export function middleware(request: NextRequest) {
  console.info(
    "[middleware:api]",
    request.method,
    request.nextUrl.pathname,
    JSON.stringify({ ua: request.headers.get("user-agent")?.slice(0, 60) ?? "" })
  )
  return NextResponse.next()
}

export const config = {
  matcher: "/api/:path*",
}
