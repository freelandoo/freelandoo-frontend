// lib/community-site.ts
// Leitura do site público da comunidade (server-side).
//
// Chama o backend DIRETO, não o proxy `/api/...`: estas funções rodam no
// servidor do Next (ISR), então o proxy só acrescentaria um salto e uma
// invocação cobrada na Vercel sem centralizar nada — o logging do proxy existe
// para chamadas do browser, e aqui não há browser.

import { getBackendApiUrl } from "@/lib/backend"
import type {
  CommunitySiteConfig,
  ShowcaseService,
  SiteProfessional,
} from "@/types/community-site"
import type { SiteTemplate, TemplateLinks } from "@/types/site-template"

/**
 * Revalidação do site público.
 *
 * 10 minutos é uma escolha de CUSTO, não de gosto: um site publicado muda
 * pouco e é justamente a superfície que buscador e robô varrem sem parar.
 * Sem cache, cada varredura viraria uma renderização paga.
 */
export const SITE_REVALIDATE_SECONDS = 600

export type PublicSite = {
  locked: boolean
  slug: string
  id_profile: string
  published_at?: string | null
  updated_at?: string | null
  community: { display_name: string; avatar_url: string | null; bio?: string | null }
  config: CommunitySiteConfig | null
  /**
   * Serviços cadastrados que a vitrine mostra (2026-09-04). Não fazem parte do
   * documento do site: vêm do cadastro real do líder e são recarregados a cada
   * revalidação do ISR — ou seja, mudar um serviço reflete no site em até
   * SITE_REVALIDATE_SECONDS, sem republicar.
   */
  services?: ShowcaseService[]
  /**
   * Quem atende (mig 221): o líder e a equipe promovida. É a lista da página de
   * agendamento — e, com uma pessoa só, ela some da tela em vez de virar uma
   * escolha entre um.
   */
  professionals?: SiteProfessional[]
  /** Perfil onde os serviços são contratados (destino do botão do card). */
  provider_profile_id?: string | null
  /**
   * O site FEITO PELA FREELANDOO (mig 241), quando este é um.
   *
   * ⚠️ Presente, ele MANDA: a rota desenha o tema e ignora `config`, porque num
   * site de tema o canvas de seções está vazio — abrir por ele daria uma página
   * em branco no domínio do cliente, sem um único erro em lugar nenhum.
   *
   * Ausente (o caso de todo mundo) é o site do construtor, como sempre foi.
   */
  template?: SiteTemplate | null
}

/** `null` = não existe (ou não está publicado). Quem chama transforma em 404. */
export async function fetchPublicSiteBySlug(slug: string): Promise<PublicSite | null> {
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/communities/site/by-slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: SITE_REVALIDATE_SECONDS } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as PublicSite & { error?: string }
    if (data.error) return null
    return data
  } catch {
    // Backend fora do ar não deve derrubar a rota com stack trace: vira 404,
    // que é o que o visitante consegue entender.
    return null
  }
}

/**
 * Domínio próprio → slug do site.
 *
 * Cacheado pelo MESMO motivo do site: esta resolução acontece em toda visita
 * vinda de domínio de comunidade, e o mapeamento domínio→site quase nunca muda.
 */
export async function resolveHostToSlug(host: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${getBackendApiUrl()}/communities/site/resolve-host?host=${encodeURIComponent(host)}`,
      { next: { revalidate: SITE_REVALIDATE_SECONDS } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { slug?: string; error?: string }
    return data.slug || null
  } catch {
    return null
  }
}

// ─── Os endereços de um site gerenciado ──────────────────────────────────────
//
// ⚠️ UM LUGAR SÓ, e não uma cópia em cada rota. O mesmo site é servido em três
// endereços, e o tema monta link, canônico e JSON-LD a partir disto: com quatro
// cópias, a que ficasse para trás publicaria no domínio do cliente um canônico
// apontando para a plataforma — sem erro, e desfazendo o SEO que a feature veio
// buscar.

/**
 * A origem da plataforma.
 *
 * Espelha o `metadataBase` do layout raiz. Os dois têm que dizer a mesma coisa:
 * um resolve os metadados relativos, o outro monta o `@id` absoluto do
 * JSON-LD, e divergindo eles descreveriam dois sites.
 */
const PLATFORM_ORIGIN = "https://www.freelandoo.com.br"

/**
 * Agendar só é oferecido quando há o que agendar.
 *
 * A página de agendamento é montada a partir dos serviços CADASTRADOS. Sem
 * nenhum, o botão levaria a um passo 1 vazio — e este tema serve muito negócio
 * que trabalha sob orçamento, onde agendar online nunca foi o caminho.
 */
function bookingFor(site: PublicSite, href: string): string | null {
  return (site.services?.length ?? 0) > 0 ? href : null
}

/** `freelandoo.com.br/c/<slug>` — vale também para o subdomínio, que reescreve para cá. */
export function platformTemplateLinks(site: PublicSite, slug: string): TemplateLinks {
  return {
    origin: PLATFORM_ORIGIN,
    communityId: site.id_profile,
    home: `/c/${slug}`,
    pageBase: `/c/${slug}/pagina`,
    booking: bookingFor(site, `/c/${slug}/agendar`),
  }
}

/**
 * O domínio do cliente.
 *
 * Aqui o site é a RAIZ, e os caminhos são relativos: o navegador está no
 * domínio dele, e é o proxy que traduz de volta para `/dominio/<host>/...`.
 * Só a origem é absoluta, e é a DELE — é ela que o JSON-LD e o canônico
 * declaram ao buscador.
 */
export function domainTemplateLinks(site: PublicSite, host: string): TemplateLinks {
  return {
    origin: `https://${host}`,
    communityId: site.id_profile,
    home: "/",
    pageBase: "/pagina",
    booking: bookingFor(site, "/agendar"),
  }
}
