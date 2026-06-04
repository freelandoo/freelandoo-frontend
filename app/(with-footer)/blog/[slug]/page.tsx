import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock } from "lucide-react"
import { ContentAd } from "@/components/ads/content-ad"
import { BlogArticle } from "@/components/blog/blog-article"
import { fetchBlogPost } from "@/lib/blog"

export const revalidate = 300

const BASE_URL = "https://www.freelandoo.com.br"

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return ""
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchBlogPost(slug)
  if (!data) return { title: "Post não encontrado — Blog Freelandoo" }
  const { post } = data
  const title = post.seo_title || `${post.title} | Blog Freelandoo`
  const description = post.seo_description || post.excerpt || undefined
  const url = `${BASE_URL}/blog/${post.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: description || undefined,
      url,
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
    },
    twitter: {
      card: post.cover_url ? "summary_large_image" : "summary",
      title: post.title,
      description: description || undefined,
      images: post.cover_url ? [post.cover_url] : undefined,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchBlogPost(slug)
  if (!data) notFound()
  const { post, related } = data

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seo_description || post.excerpt || undefined,
    image: post.cover_url || undefined,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author_name || "Freelandoo" },
    publisher: {
      "@type": "Organization",
      name: "Freelandoo",
      url: BASE_URL,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${post.slug}` },
  }

  return (
    <main className="min-h-[100dvh] bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="mx-auto w-full max-w-3xl px-4 py-10 md:py-16">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao blog
        </Link>

        <header className="mt-6">
          {post.category && (
            <Link
              href={`/blog?category=${encodeURIComponent(post.category)}`}
              className="text-sm font-semibold uppercase tracking-[0.15em] text-amber-600 hover:text-amber-700"
            >
              {post.category}
            </Link>
          )}
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-4xl">
            {post.title}
          </h1>
          {post.excerpt && <p className="mt-4 text-lg leading-relaxed text-zinc-600">{post.excerpt}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3 border-b border-zinc-200 pb-6 text-sm text-zinc-500">
            <span className="font-medium text-zinc-700">{post.author_name}</span>
            <span aria-hidden>·</span>
            <span>{formatDate(post.published_at)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {post.reading_minutes} min de leitura
            </span>
          </div>
        </header>

        {post.cover_url && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover_url} alt={post.cover_alt || post.title} className="w-full object-cover" />
          </div>
        )}

        <div className="mt-8">
          <BlogArticle markdown={post.body_md} />
        </div>

        {post.tags?.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-zinc-200 pt-6">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                #{t}
              </span>
            ))}
          </div>
        )}
      </article>

      <ContentAd />

      {related.length > 0 && (
        <section className="border-t border-zinc-200 bg-zinc-50">
          <div className="mx-auto w-full max-w-5xl px-4 py-12">
            <h2 className="text-xl font-semibold text-zinc-900">Continue lendo</h2>
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm"
                >
                  {r.category && (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-600">
                      {r.category}
                    </span>
                  )}
                  <p className="mt-2 font-semibold leading-snug text-zinc-900 group-hover:text-amber-700">
                    {r.title}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3.5 w-3.5" />
                    {r.reading_minutes} min
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
