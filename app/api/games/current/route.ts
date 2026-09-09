import { forwardToBackend } from "@/lib/api-proxy"

// O JOGO ATUAL é do USUÁRIO (mig 232), como a Carteira é dentro do Financeiro:
// a plataforma é o feed, o que está dentro dela é de cada um. Sem id de
// comunidade na URL — não existe espaço de ninguém para nomear.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/games/current")
}

export async function PATCH(request: Request) {
  return forwardToBackend(request, "PATCH", "/games/current")
}
