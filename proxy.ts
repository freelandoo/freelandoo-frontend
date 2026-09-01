// proxy.ts — roteamento por HOST dos sites de comunidade (migs 213/214).
//
// Chama-se `proxy` e não `middleware` porque o Next 16 renomeou a convenção
// (o nome antigo ainda funciona, mas avisa a cada build). Uma diferença real
// vem junto: `proxy` roda no runtime Node, não no edge. Não muda nada aqui —
// este arquivo não faz I/O nenhum, só manipula string.
//
// Traduz tres formas de chegar no mesmo site:
//
//   freelandoo.com.br/c/padaria      → já é a rota final, passa direto
//   padaria.freelandoo.com.br        → reescreve para /c/padaria
//   padariadoze.com.br               → reescreve para /dominio/padariadoze.com.br
//
// ═══ A REGRA QUE GOVERNA ESTE ARQUIVO: ZERO I/O ═══
//
// Este arquivo roda em TODA requisição — inclusive de robô, de varredura e de
// gente que digitou errado. Uma consulta ao banco aqui multiplicaria o custo
// por cada uma delas, e este projeto já tomou duas decisões para reduzir
// exatamente esse tipo de gasto (polling→push, logging por request).
//
// Por isso ele só faz manipulação de STRING. O subdomínio já carrega o
// slug no próprio nome, então nem precisa de consulta. E o domínio próprio, que
// precisa, é reescrito para uma rota que resolve o host DENTRO da página — onde
// o ISR guarda o resultado por 10 minutos. A consulta acontece uma vez a cada
// 10 minutos por domínio, não uma vez por visita.
//
// ⚠️ Cuidado ao mexer: o layout raiz NÃO PODE ler headers()/cookies() (isso
// re-dinamiza todas as rotas e mata o static/ISR do site inteiro). Ler o Host
// AQUI é justamente o que permite obedecer àquela regra.

import { NextResponse, type NextRequest } from "next/server"

/**
 * Domínios da própria plataforma. Um Host que termine em algum deles é tráfego
 * normal do produto; qualquer outro é candidato a domínio de comunidade.
 *
 * `vercel.app` entra porque os deploys de preview vivem lá e não podem ser
 * confundidos com domínio de cliente — sem isso, cada preview seria tratado
 * como um domínio desconhecido e o site inteiro viraria 404.
 */
const PLATFORM_HOSTS = [
  "freelandoo.com.br",
  "freelandoo.com",
  "vercel.app",
  "localhost",
]

/**
 * Subdomínios que NUNCA viram site de comunidade.
 *
 * Espelha (em versão curta) a lista do backend em `utils/communitySiteSlug.js`.
 * A lista completa mora lá, que é quem recusa a criação — aqui ficam só os que
 * podem chegar como Host de verdade. É uma segunda cerca: se um dia um slug
 * proibido escapar para o banco, ele ainda não sequestra o `www`.
 */
const RESERVED_SUBDOMAINS = new Set([
  "www", "api", "app", "admin", "backend", "cdn", "static", "assets",
  "mail", "email", "smtp", "ns1", "ns2", "dns", "ws", "realtime",
  "dev", "staging", "test", "preview", "beta", "status", "docs", "blog",
])

/** Host cru → nome de domínio (sem porta, minúsculo). */
function cleanHost(raw: string | null): string {
  if (!raw) return ""
  return raw.split(":")[0].trim().toLowerCase().replace(/\.+$/, "")
}

function platformApexFor(host: string): string | null {
  return PLATFORM_HOSTS.find((apex) => host === apex || host.endsWith(`.${apex}`)) || null
}

export function proxy(request: NextRequest) {
  const host = cleanHost(request.headers.get("host"))
  if (!host) return NextResponse.next()

  const apex = platformApexFor(host)
  const { pathname, search } = request.nextUrl

  // ─── Domínio da plataforma ────────────────────────────────────────────────
  if (apex) {
    // `padaria.freelandoo.com.br` → o slug É o rótulo da esquerda.
    const prefix = host.slice(0, host.length - apex.length).replace(/\.$/, "")

    // Sem prefixo (o apex puro) ou prefixo reservado: tráfego normal do site.
    // `vercel.app` e `localhost` também caem aqui — em preview e em bancada
    // local o subdomínio não é de comunidade, é o nome do deploy.
    if (
      !prefix ||
      prefix.includes(".") ||
      RESERVED_SUBDOMAINS.has(prefix) ||
      apex === "vercel.app" ||
      apex === "localhost"
    ) {
      return NextResponse.next()
    }

    // O subdomínio serve UM site. A raiz vira a página dele; qualquer outro
    // caminho segue normal, para que /api, /_next e links internos não quebrem.
    if (pathname === "/") {
      const url = request.nextUrl.clone()
      url.pathname = `/c/${prefix}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // ─── Domínio próprio de comunidade ────────────────────────────────────────
  // Host que não é da plataforma só pode ter chegado aqui porque alguém apontou
  // o DNS para nós. Quem descobre de quem é o domínio é a página — aqui só
  // carregamos o Host no caminho, sem consultar nada.
  const url = request.nextUrl.clone()
  url.pathname = `/dominio/${encodeURIComponent(host)}`
  url.search = search
  return NextResponse.rewrite(url)
}

export const config = {
  /**
   * O que NAO passa por aqui.
   *
   * Excluir `_next` e os estáticos não é otimização, é correção: reescrever um
   * pedido de JS ou de imagem para a página do site devolveria HTML no lugar do
   * arquivo, e a página quebraria em silêncio (o navegador só reclamaria de
   * "tipo MIME inesperado"). `api` fica de fora para que as chamadas da própria
   * página continuem funcionando quando ela é servida por domínio próprio.
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[\\w]+$).*)",
  ],
}
