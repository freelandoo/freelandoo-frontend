import type { MetadataRoute } from "next"
import { getBackendApiUrl } from "@/lib/backend"
import { buildProfileUrl, slugify } from "@/lib/slug"
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

interface MachineEntry {
  slug: string
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

async function fetchMachines(): Promise<MachineEntry[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${getBackendApiUrl()}/enxames`, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))
    if (!res.ok) return []
    const body = await res.json()
    const list = Array.isArray(body)
      ? body
      : Array.isArray(body?.enxames)
        ? body.enxames
        : []
    return list
      .filter(
        (m: unknown): m is MachineEntry =>
          !!m &&
          typeof (m as MachineEntry).slug === "string" &&
          (m as MachineEntry).slug.length > 0
      )
      .map((m: MachineEntry) => ({ slug: m.slug }))
  } catch {
    return []
  }
}

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const seen = new Set<string>()
  const routes: MetadataRoute.Sitemap = []

  const push = (entry: MetadataRoute.Sitemap[number]) => {
    if (seen.has(entry.url)) return
    seen.add(entry.url)
    routes.push({ lastModified: now, ...entry })
  }

  for (const r of STATIC_ROUTES) push(r)

  // Enxames — uma página de pouso por enxame é página de funil.
  for (const m of await fetchMachines()) {
    push({
      url: `${BASE_URL}/enxame/${m.slug}`,
      changeFrequency: "daily",
      priority: 0.85,
    })
  }

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
  const cityProfPairs = new Set<string>()
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

      // Sub-perfil obrigatório pra montar URL canônica de 4 segmentos. Se o
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

      const citySlug = slugify(p.municipio) || "brasil"
      cityProfPairs.add(`${p.profession_slug}/${citySlug}`)
    }

    if (list.length < limit) break
  }

  for (const pair of cityProfPairs) {
    push({
      url: `${BASE_URL}/${pair}`,
      changeFrequency: "weekly",
      priority: 0.6,
    })
  }

  return routes
}
