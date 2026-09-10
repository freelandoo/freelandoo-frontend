import { forwardToBackend } from "@/lib/api-proxy"

// ABRE A PLATAFORMA DE GAMES — uma só, do site inteiro (mig 232). Não cria a
// de ninguém: o backend faz get-or-create do singleton e devolve sempre a
// mesma linha.
//
// Voltou em 2026-09-09 junto com o pill roxo do headcard (pedido do Alex); é o
// único chamador. Sem o pill, este proxy é a porta que recria o que a
// demolição tirou — apagar os dois juntos, se um dia saírem de novo.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/games/platform")
}
