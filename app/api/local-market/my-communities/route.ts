import { forwardToBackend } from "@/lib/api-proxy"

// As comunidades de quem pede — o seletor "na minha comunidade" do relatório.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/local-market/my-communities")
}
