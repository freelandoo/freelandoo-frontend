import { forwardToBackend } from "@/lib/api-proxy"

// O menu da foto de perfil (mig 210): tudo o que é do usuário — comunidade,
// condomínio, bairro, pet, carro, games e academia — numa requisição só.
export async function GET(request: Request) {
  return forwardToBackend(request, "GET", "/me/spaces")
}
