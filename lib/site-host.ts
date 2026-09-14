// De quem é este Host — a pergunta que separa o tráfego da plataforma do site
// de um cliente.
//
// ⚠️ MORA NUM MÓDULO PRÓPRIO PORQUE TRÊS LUGARES PRECISAM DA MESMA RESPOSTA e
// nenhum deles pode discordar dos outros: o `proxy.ts` (que decide o que
// reescrever), o `app/robots.ts` e o `app/sitemap.ts` (que decidem de QUEM é o
// site que estão descrevendo). Com a lista escrita três vezes, um domínio novo
// da plataforma entraria numa e ficaria de fora das outras — e o sintoma seria
// o buscador recebendo o mapa do site errado, sem um erro em lugar nenhum.
//
// Só manipulação de STRING, sem I/O: este módulo é importado pelo `proxy.ts`,
// que roda em toda requisição e tem essa regra cravada.

/**
 * Domínios da própria plataforma. Um Host que termine em algum deles é tráfego
 * normal do produto; qualquer outro é candidato a domínio de comunidade.
 *
 * `vercel.app` entra porque os deploys de preview vivem lá e não podem ser
 * confundidos com domínio de cliente — sem isso, cada preview seria tratado
 * como um domínio desconhecido e o site inteiro viraria 404.
 */
export const PLATFORM_HOSTS = [
  "freelandoo.com.br",
  "freelandoo.com",
  "vercel.app",
  "localhost",
]

/** Host cru → nome de domínio (sem porta, minúsculo). */
export function cleanHost(raw: string | null | undefined): string {
  if (!raw) return ""
  return raw.split(":")[0].trim().toLowerCase().replace(/\.+$/, "")
}

/** O domínio da plataforma sob o qual este Host vive, ou `null`. */
export function platformApexFor(host: string): string | null {
  return PLATFORM_HOSTS.find((apex) => host === apex || host.endsWith(`.${apex}`)) || null
}

/**
 * É um domínio de cliente?
 *
 * Host vazio conta como plataforma de propósito: sem saber quem está pedindo, a
 * resposta segura é a nossa — descrever o site de um cliente é que exigiria
 * certeza.
 */
export function isCommunityDomain(host: string): boolean {
  return !!host && platformApexFor(host) === null
}
