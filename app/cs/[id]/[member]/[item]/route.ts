import crypto from "crypto"
import { getBackendApiUrl } from "@/lib/backend"

/**
 * Link de share rastreado da comunidade: /cs/{community}/{member}/{item}
 * Registra o "retorno" (1 ponto pro membro que compartilhou — só se ele for
 * membro; dedupe por visitante no backend) e redireciona pra comunidade.
 * O visitor_hash é derivado de IP+UA (dedupe best-effort anti-spam).
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string; member: string; item: string }> }
) {
  const { id, member, item } = await ctx.params
  const fwd = request.headers.get("x-forwarded-for") || ""
  const ip = (fwd.split(",")[0] || "").trim() || "0.0.0.0"
  const ua = request.headers.get("user-agent") || ""
  const visitor_hash = crypto.createHash("sha256").update(`${ip}|${ua}`).digest("hex").slice(0, 40)

  try {
    await fetch(`${getBackendApiUrl()}/communities/${encodeURIComponent(id)}/share-return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_member_user: member, id_portfolio_item: item, visitor_hash }),
    })
  } catch {
    /* nunca quebra o redirect */
  }

  return Response.redirect(new URL(`/comunidades/${encodeURIComponent(id)}`, request.url), 302)
}
