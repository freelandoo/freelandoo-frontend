import type { Metadata } from "next"
import Link from "next/link"
import { Clock } from "lucide-react"
import { fetchBlogList, type BlogPostCard } from "@/lib/blog"

export const revalidate = 300

const BASE_URL = "https://www.freelandoo.com.br"

export const metadata: Metadata = {
  title: "Blog Freelandoo — guias práticos para profissionais autônomos",
  description:
    "Guias práticos sobre como precificar serviços, montar portfólio, vender produtos, usar vídeo e crescer como profissional autônomo no Brasil.",
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    type: "website",
    title: "Blog Freelandoo",
    description:
      "Guias práticos para profissionais autônomos: preço, portfólio, vendas, agenda, conteúdo e mais.",
    url: `${BASE_URL}/blog`,
  },
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return ""
  }
}

function PostCard({ post }: { post: BlogPostCard }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_18px_50px_-20px_rgba(0,0,0,0.25)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {post.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt={post.cover_alt || post.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#fde68a,transparent_55%),linear-gradient(135deg,#18181b,#27272a)]">
            <span className="px-6 text-center text-lg font-semibold leading-snug text-amber-100/90">
              {post.category || "Freelandoo"}
            </span>
          </div>
        )}
        {post.category && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-800 backdrop-blur">
            {post.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-lg font-semibold leading-snug text-zinc-900 group-hover:text-amber-700">
          {post.title}
        </h2>
        {post.excerpt && <p className="line-clamp-3 text-sm leading-relaxed text-zinc-600">{post.excerpt}</p>}
        <div className="mt-auto flex items-center gap-3 pt-3 text-xs text-zinc-500">
          <span>{formatDate(post.published_at)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.reading_minutes} min
          </span>
        </div>
      </div>
    </Link>
  )
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(Number(sp.page) || 1, 1)
  const category = sp.category ? String(sp.category) : undefined
  const { posts, total, per_page, categories } = await fetchBlogList({ page, category })
  const totalPages = Math.max(1, Math.ceil(total / per_page))

  const catHref = (c?: string) => (c ? `/blog?category=${encodeURIComponent(c)}` : "/blog")

  return (
    <main className="min-h-[100dvh] bg-zinc-50">
      <section className="border-b border-zinc-200 bg-white">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Blog Freelandoo</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Guias práticos para quem vive do próprio trabalho
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
            Preço, portfólio, agenda, vendas, vídeo e mais. Conteúdo direto ao ponto para você atrair clientes
            e crescer como profissional autônomo.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        {categories.length > 0 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                !category
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
              }`}
            >
              Todos
            </Link>
            {categories.map((c) => (
              <Link
                key={c.category}
                href={catHref(c.category)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  category === c.category
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {c.category}
              </Link>
            ))}
          </nav>
        )}

        {posts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white py-20 text-center">
            <p className="text-lg font-medium text-zinc-700">Nenhum post por aqui ainda.</p>
            <p className="mt-1 text-sm text-zinc-500">Volte em breve — novos guias toda semana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-3">
            {page > 1 && (
              <Link
                href={`/blog?${new URLSearchParams({ ...(category ? { category } : {}), page: String(page - 1) })}`}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400"
              >
                Anterior
              </Link>
            )}
            <span className="text-sm text-zinc-500">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?${new URLSearchParams({ ...(category ? { category } : {}), page: String(page + 1) })}`}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400"
              >
                Próxima
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
