import { forwardToBackend } from "@/lib/api-proxy"

// ABRE A PLATAFORMA DE GAMES — uma só, do site inteiro (mig 232). Não cria a
// de ninguém: o backend faz get-or-create do singleton e devolve sempre a
// mesma linha.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/games/platform")
}
