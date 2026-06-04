import { getBackendApiUrl } from "@/lib/backend"

export interface BlogPostCard {
  slug: string
  title: string
  excerpt: string | null
  cover_url: string | null
  cover_alt: string | null
  category: string | null
  tags: string[]
  reading_minutes: number
  author_name: string
  published_at: string
}

export interface BlogPostFull extends BlogPostCard {
  id: string
  body_md: string
  status: "draft" | "published"
  seo_title: string | null
  seo_description: string | null
  views: number
  updated_at: string
}

export interface BlogCategory {
  category: string
  total: number
}

export interface BlogListResult {
  posts: BlogPostCard[]
  total: number
  page: number
  per_page: number
  categories: BlogCategory[]
}

async function getJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const res = await fetch(url, { next: { revalidate }, signal: controller.signal }).finally(() =>
      clearTimeout(timer),
    )
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function fetchBlogList(params: { page?: number; category?: string } = {}): Promise<BlogListResult> {
  const qs = new URLSearchParams()
  if (params.page && params.page > 1) qs.set("page", String(params.page))
  if (params.category) qs.set("category", params.category)
  const url = `${getBackendApiUrl()}/blog/posts${qs.toString() ? `?${qs.toString()}` : ""}`
  const data = await getJson<BlogListResult>(url, 300)
  return (
    data || { posts: [], total: 0, page: params.page || 1, per_page: 12, categories: [] }
  )
}

export async function fetchBlogPost(
  slug: string,
): Promise<{ post: BlogPostFull; related: BlogPostCard[] } | null> {
  const url = `${getBackendApiUrl()}/blog/posts/${encodeURIComponent(slug)}`
  return getJson<{ post: BlogPostFull; related: BlogPostCard[] }>(url, 300)
}

export async function fetchBlogSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  // Usa a listagem paginada para coletar slugs (até ~250). Suficiente para sitemap.
  const all: { slug: string; updated_at: string }[] = []
  for (let page = 1; page <= 20; page++) {
    const data = await fetchBlogList({ page })
    if (!data.posts.length) break
    for (const p of data.posts) all.push({ slug: p.slug, updated_at: p.published_at })
    if (data.posts.length < data.per_page) break
  }
  return all
}
