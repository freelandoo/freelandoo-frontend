import { forwardToBackend } from "@/lib/api-proxy"

// Relatório de mercado local. A querystring passa inteira (forwardToBackend
// repassa `search`).
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/local-market/report")
}
