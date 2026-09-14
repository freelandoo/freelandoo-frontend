// O robots.txt — e ele RESPONDE POR HOST.
//
// ⚠️ ESTE ARQUIVO SERVE TAMBÉM O DOMÍNIO DO CLIENTE. O `proxy.ts` exclui
// `robots.txt` do matcher de propósito (reescrevê-lo daria HTML no lugar do
// arquivo), então a requisição chega aqui crua — e, até esta correção, quem
// pedia `ricardofogoes.com.br/robots.txt` recebia o NOSSO: com os Disallow de
// rotas que não existem lá e, pior, apontando o sitemap para
// `freelandoo.com.br/sitemap.xml`. Referência de sitemap entre domínios
// diferentes é ignorada pelo buscador, então o site do cliente ficava sem mapa
// nenhum e a descoberta dele dependia só de link.
//
// ⚠️ Ler o Host torna esta rota dinâmica. É uma invocação por pedido de
// robots.txt — algumas por dia, vindas de robô —, e é o preço de não descrever
// o site errado. Não vale para o sitemap da plataforma, que já era dinâmico.

import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { cleanHost, isCommunityDomain } from "@/lib/site-host"

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = cleanHost((await headers()).get("host"))

  // Domínio do cliente: o robots é DELE. Nada a esconder (ali não existe
  // /account nem /admin) e o mapa é o do próprio domínio.
  if (isCommunityDomain(host)) {
    return {
      rules: { userAgent: "*", allow: "/" },
      sitemap: `https://${host}/sitemap.xml`,
    }
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account",
        "/account/*",
        "/admin",
        "/admin/*",
        "/login",
        "/cadastro",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
        "/confirmar-email",
        "/activate",
        "/api",
        "/api/*",
      ],
    },
    sitemap: "https://www.freelandoo.com.br/sitemap.xml",
  }
}
