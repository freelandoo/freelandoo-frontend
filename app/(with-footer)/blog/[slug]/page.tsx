import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { BlogPostView } from "@/components/blog/blog-post-view"
import { fetchBlogPost } from "@/lib/blog"

// ISR: post renderizado sob demanda e cacheado por 5 min (F3.S5). Publicação/
// edição aparece em até 5 min — mesmo prazo do índice /blog.
export const revalidate = 300

// Sem isto o Next trata a rota como 100% dinâmica; vazio = nada prerenderizado
// no build, mas cada slug visitado entra no cache ISR (dynamicParams default).
export function generateStaticParams(): { slug: string }[] {
  return []
}

const BASE_URL = "https://www.freelandoo.com.br"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchBlogPost(slug)
  if (!data) return { title: "Post não encontrado — Blog Freelandoo" }
  const { post } = data
  const isDraft = post.status !== "published"
  const title = post.seo_title || `${post.title} | Blog Freelandoo`
  const description = post.seo_description || post.excerpt || undefined
  const url = `${BASE_URL}/blog/${post.slug}`
  return {
    title,
    description,
    // Rascunho nunca é indexado; publicado é explicitamente indexável.
    robots: isDraft
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
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

  const jsonLd =
    post.status === "published"
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.seo_description || post.excerpt || undefined,
          image: post.cover_url || undefined,
          datePublished: post.published_at,
          dateModified: post.updated_at,
          author: { "@type": "Organization", name: post.author_name || "Freelandoo" },
          publisher: { "@type": "Organization", name: "Freelandoo", url: BASE_URL },
          mainEntityOfPage: { "@type": "WebPage", "@id": `${BASE_URL}/blog/${post.slug}` },
        }
      : null

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <BlogPostView initial={post} related={related} />
    </>
  )
}
