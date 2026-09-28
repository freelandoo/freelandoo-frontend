import { forwardToBackend } from "@/lib/api-proxy"

// Abre o pagamento do selo verificado: { method: "card" | "pix" }.
export async function POST(request: Request) {
  return forwardToBackend(request, "POST", "/me/verification/checkout")
}
