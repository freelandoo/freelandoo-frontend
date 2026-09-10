import { forwardToBackend } from "@/lib/api-proxy"

// A assinatura de plano de quem está logado (mig 225/234).
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/plans/mine")
}

// Cancelar NÃO passa por flag nenhuma: porta de saída trancada é a única que
// não pode existir. O backend encerra no Stripe no FIM do período pago.
export async function DELETE(request: Request) {
  return forwardToBackend(request, "DELETE", "/plans/mine")
}
