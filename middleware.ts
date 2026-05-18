import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

// Middleware desativado temporariamente — estava potencialmente pendurando
// funções no Edge runtime. Logging vai pros route handlers individuais
// (apiFlow ja loga la). Reabilitar so apos investigar Edge runtime.
export function middleware(_request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // matcher vazio — middleware nao roda em nada por enquanto.
  matcher: [],
}
