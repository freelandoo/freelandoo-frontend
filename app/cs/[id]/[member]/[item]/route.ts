import { getBackendApiUrl } from "@/lib/backend"

/**
 * Link de share rastreado da comunidade: /cs/{community}/{member}/{item}
 *
 * O "retorno" (1 ponto pro membro que compartilhou; a temporada "shares" paga
 * Esmeraldas) é contado pelo BACKEND, com o navegador do visitante chegando lá:
 * a marca do visitante sai do IP real + navegador com chave do servidor e o
 * backend redireciona para a comunidade. Antes esta rota calculava a marca e a
 * mandava no corpo de um POST público — qualquer membro inventava marcas e
 * ganhava a temporada (A1-12).
 */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string; member: string; item: string }> }
) {
  const { id, member, item } = await ctx.params
  const path = [id, "s", member, item].map((p, i) => (i === 1 ? p : encodeURIComponent(p))).join("/")
  return Response.redirect(`${getBackendApiUrl()}/communities/${path}`, 302)
}
