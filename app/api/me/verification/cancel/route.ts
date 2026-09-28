import { forwardToBackend } from "@/lib/api-proxy"

// Solta a renovação do selo. Ele fica até o fim do período pago.
export async function POST(request: Request) {
  return forwardToBackend(request, "POST", "/me/verification/cancel")
}
