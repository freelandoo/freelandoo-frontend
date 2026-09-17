import type { MetadataRoute } from "next"
import { headers } from "next/headers"
import { templateFor } from "@/components/site-templates/registry"
import { getBackendApiUrl } from "@/lib/backend"
import { fetchPublicSiteBySlug, resolveHostToSlug } from "@/lib/community-site"
import { cleanHost, isCommunityDomain } from "@/lib/site-host"
import { buildProfileUrl } from "@/lib/slug"
import { fetchBlogSlugs } from "@/lib/blog"

const BASE_URL = "https://www.freelandoo.com.br"

// Força dinâmico — antes o sitemap era prerenderado em build time, mas o
// fetch ao backend Railway pode falhar no ambiente de build do Vercel
// (ECONNREFUSED, DNS, firewall), e isso DERRUBA O BUILD INTEIRO. Render no
// request com revalidate é seguro.
export const dynamic = "force-dynamic"
export const revalidate = 600

// Username válido: letras/números/underscore/ponto, 3–30 chars. Reflete a regra
// já usada nas rotas dinâmicas (isValidHandleParam em [profession]/[city]/[handle]).
const USERNAME_RE = /^[a-z0-9][a-z0-9_.]{2,29}$/i

interface SearchProfile {
  id_profile: string
  username: string | null
  profession_slug: string | null
  sub_profile_slug: string | null
  municipio: string | null
  is_clan: boolean
}

const STATIC_ROUTES: MetadataRoute.Sitemap = [
  { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
  { url: `${BASE_URL}/feed`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE_URL}/search`, changeFrequency: "daily", priority: 0.9 },
  { url: `${BASE_URL}/contratar-profissionais`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/anunciar-servicos`, changeFrequency: "monthly", priority: 0.8 },
  { url: `${BASE_URL}/precos`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/comofunciona`, changeFrequency: "monthly", priority: 0.7 },
  { url: `${BASE_URL}/blog`, changeFrequency: "weekly", priority: 0.8 },
  { url: `${BASE_URL}/ranking`, changeFrequency: "weekly", priority: 0.6 },
  { url: `${BASE_URL}/sobre-nos`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/comunidade`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/central-de-ajuda`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${BASE_URL}/carreiras`, changeFrequency: "monthly", priority: 0.4 },
  { url: `${BASE_URL}/dicas-de-seguranca`, changeFrequency: "yearly", priority: 0.4 },
  { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/cookies-policy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/subscription-terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/affiliate-terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/marketplace-terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/return-policy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/community-guidelines`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/moderation-policy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/copyright-policy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/polens-terms`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/minors-policy`, changeFrequency: "yearly", priority: 0.3 },
  { url: `${BASE_URL}/advertising-policy`, changeFrequency: "yearly", priority: 0.3 },
]

async function fetchProfilesPage(offset: number, limit: number): Promise<SearchProfile[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(
        `${getBackendApiUrl()}/search?limit=${limit}&offset=${offset}`,
        { next: { revalidate: 3600 }, signal: controller.signal }
      )
      if (!res.ok) return []
      const body = await res.json()
      return Array.isArray(body) ? body : []
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return []
  }
}

/**
 * O mapa do site de UM cliente, servido no domínio dele.
 *
 * ⚠️ ESTE ARQUIVO RESPONDE TAMBÉM EM `ricardofogoes.com.br/sitemap.xml` — o
 * `proxy.ts` exclui `sitemap.xml` do matcher, então o pedido chega aqui cru.
 * Até esta correção ele devolvia o mapa da PLATAFORMA: 107 URLs de
 * freelandoo.com.br e nenhuma do cliente. Submetido no Search Console do
 * domínio dele, um mapa assim não indexa nada — toda URL é de outro domínio, e
 * o buscador descarta as que não pertencem à propriedade.
 *
 * O sitemap da plataforma continua NÃO listando os sites dos clientes: eles não
 * são páginas nossas, e anunciá-los dali diria ao buscador que o dono do
 * conteúdo é a Freelandoo. O mapa de cada um mora no domínio de cada um.
 */
async function communitySitemap(host: string): Promise<MetadataRoute.Sitemap> {
  const slug = await resolveHostToSlug(host)
  if (!slug) return []
  const site = await fetchPublicSiteBySlug(slug)
  // Comunidade fechada não entra: o conteúdo dela não é público, e um mapa é
  // justamente um convite para o robô entrar.
  if (!site || site.locked) return []

  const origin = `https://${host}`
  const lastModified = site.updated_at || site.published_at || undefined

  // ⚠️ AS PÁGINAS SAEM DE QUEM AS DESENHA. Num site de tema, do próprio tema
  // (o documento é vazio); num site do construtor, do documento. Uma lista
  // montada aqui divergiria da rota na primeira página nova — e o sintoma seria
  // um 404 no mapa, ou uma página no ar que o buscador nunca encontra.
  const pages = site.template
    ? (templateFor(site.template.slug)?.pageSlugs(site.template.data) ?? [])
    : (site.config?.pages ?? []).filter((page) => page.enabled).map((page) => page.slug)

  const routes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    ...pages.map((page) => ({
      url: `${origin}/pagina/${page}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]

  // ⚠️ `/agendar` FICA DE FORA, e não é esquecimento: aquela rota declara
  // `robots: { index: false }` de propósito — é um formulário de três passos,
  // não uma página de conteúdo. Sitemap é a lista do que se QUER indexado;
  // listar uma URL noindex rende uma linha de "excluída por noindex" no Search
  // Console para cada site, e gasta rastreamento num endereço que nunca vai
  // aparecer em busca nenhuma.

  return routes
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Quem está perguntando? No domínio de um cliente o mapa é o DELE.
  const host = cleanHost((await headers()).get("host"))
  if (isCommunityDomain(host)) return communitySitemap(host)

  const now = new Date()
  const seen = new Set<string>()
  const routes: MetadataRoute.Sitemap = []

  const push = (entry: MetadataRoute.Sitemap[number]) => {
    if (seen.has(entry.url)) return
    seen.add(entry.url)
    routes.push({ lastModified: now, ...entry })
  }

  for (const r of STATIC_ROUTES) push(r)

  // ⚠️ NÃO listar /enxame/<slug>: aquela rota é só um redirect 307 para
  // /search?from=… e o /search já está no sitemap. Sitemap que anuncia desvio
  // gasta orçamento de rastreio e faz o Google ver o site como inacabado.

  // Posts do blog — camada de conteúdo editorial (SEO).
  for (const b of await fetchBlogSlugs()) {
    push({
      url: `${BASE_URL}/blog/${b.slug}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : now,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  }

  // Perfis e clans públicos via /search.
  const limit = 50
  for (let offset = 0, page = 0; page < 200; offset += limit, page++) {
    const list = await fetchProfilesPage(offset, limit)
    if (list.length === 0) break

    for (const p of list) {
      const username = (p.username || "").trim()
      if (!username || !USERNAME_RE.test(username)) continue

      if (p.is_clan) {
        // Clans usam rota própria /clans/<id> — a rota /[profession]/[city]/...
        // não suporta clan e gera /null/... no path.
        if (p.id_profile) {
          push({
            url: `${BASE_URL}/clans/${p.id_profile}`,
            changeFrequency: "weekly",
            priority: 0.7,
          })
        }
        continue
      }

      if (!p.profession_slug) continue

      // Perfil obrigatório pra montar URL canônica de 4 segmentos. Se o
      // backend não estiver retornando, evita listar a rota de 3 segmentos
      // que sempre 301-redireciona pra canônica.
      if (!p.sub_profile_slug) continue

      const profileUrl = buildProfileUrl({
        profession_slug: p.profession_slug,
        municipio: p.municipio,
        handle: username,
        sub_profile_slug: p.sub_profile_slug,
      })
      push({
        url: `${BASE_URL}${profileUrl}`,
        changeFrequency: "weekly",
        priority: 0.7,
      })

    }

    if (list.length < limit) break
  }

  // ⚠️ NÃO listar /<profissão>/<cidade>: essa rota NÃO EXISTE — o app só tem
  // /[profession]/[city]/[handle]. O sitemap anunciava 18 dessas e todas
  // respondiam 404 ao Google.
  //
  // E criá-las seria pior que removê-las: 17 dos 18 pares têm UM perfil só,
  // então nasceriam 18 páginas com um profissional cada — doorway pages, que
  // o Google penaliza. A página de cidade volta a fazer sentido quando houver
  // densidade real de profissionais por cidade.

  return routes
}
