import { forwardToBackend } from "@/lib/api-proxy"

type Ctx = { params: Promise<{ id_profile: string }> }

// O assunto (raça, modelo, jogo) é escolhido DENTRO da comunidade, no modo de
// edição do headcard — não há modal de cadastro.
export async function PATCH(request: Request, ctx: Ctx) {
  const { id_profile } = await ctx.params
  return forwardToBackend(request, "PATCH", `/cars/${encodeURIComponent(id_profile)}`)
}

// Excluir (lixeira do modal "Meus pets"/"Meus carros").
export async function DELETE(request: Request, ctx: Ctx) {
  const { id_profile } = await ctx.params
  return forwardToBackend(request, "DELETE", `/cars/${encodeURIComponent(id_profile)}`)
}
