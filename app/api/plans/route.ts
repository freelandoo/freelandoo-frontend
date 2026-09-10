import { forwardToBackend } from "@/lib/api-proxy"

// A vitrine dos planos mensais (mig 225/234). Auth OPCIONAL: o preço é
// informação de venda e precisa chegar a quem ainda não entrou; com token o
// backend acrescenta se ESSA pessoa já assina.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/plans", { requireAuth: false })
}
