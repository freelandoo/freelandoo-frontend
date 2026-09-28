import { forwardToBackend } from "@/lib/api-proxy"

// Selo verificado (mig 268): estado, preço e se está à venda.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/me/verification")
}
