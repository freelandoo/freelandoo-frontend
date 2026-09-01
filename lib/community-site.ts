// lib/community-site.ts
// Leitura do site público da comunidade (server-side).
//
// Chama o backend DIRETO, não o proxy `/api/...`: estas funções rodam no
// servidor do Next (ISR), então o proxy só acrescentaria um salto e uma
// invocação cobrada na Vercel sem centralizar nada — o logging do proxy existe
// para chamadas do browser, e aqui não há browser.

import { getBackendApiUrl } from "@/lib/backend"
import type { CommunitySiteConfig } from "@/types/community-site"

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
