import type { Metadata } from "next"
import Link from "next/link"
import { Clock } from "lucide-react"
import { fetchBlogList, type BlogPostCard } from "@/lib/blog"
import { BlogAdminBar } from "@/components/blog/blog-admin-bar"

export const revalidate = 300

const BASE_URL = "https://www.freelandoo.com.br"

export const metadata: Metadata = {
  title: "Blog Freelandoo — guias práticos para profissionais autônomos",
  description:
    "Guias práticos sobre como precificar serviços, montar portfólio, vender produtos, usar vídeo e crescer como profissional autônomo no Brasil.",
  alternates: { canonical: `${BASE_URL}/blog` },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
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
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
  } catch {
    return ""
  }
}

const ACCENTS = ["var(--magenta)", "var(--cyan)", "var(--gold)", "var(--purple)", "var(--leaf)", "var(--orange)"]

function PostCard({ post, idx }: { post: BlogPostCard; idx: number }) {
  const accent = ACCENTS[idx % ACCENTS.length]
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative flex flex-col border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[6px_6px_0_0_var(--ink)] transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[9px_9px_0_0_var(--ink)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b-2 border-[var(--ink)]">
        {post.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt={post.cover_alt || post.title}
            className="h-full w-full object-cover grayscale-[15%] transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center" style={{ background: accent }}>
            <div className="casa-dots absolute inset-0 opacity-20" />
            <span className="casa-display px-6 text-center text-3xl leading-[0.85] text-[var(--ink)]">
              {post.category || "Freelandoo"}
            </span>
          </div>
        )}
        {post.category && (
          <span
            className="absolute left-3 top-3 -rotate-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-2.5 py-0.5 casa-body text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--ink)]"
          >
            {post.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="casa-display text-2xl leading-[0.9] text-[var(--ink)] transition-colors group-hover:text-[var(--magenta-deep)]">
          {post.title}
        </h2>
        {post.excerpt && <p className="line-clamp-3 casa-body text-sm leading-relaxed text-[var(--ink-soft)]/80">{post.excerpt}</p>}
        <div className="mt-auto flex items-center gap-3 border-t border-[var(--line)] pt-3 casa-body text-[11px] font-bold uppercase tracking-wide text-[var(--ink-soft)]/60">
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
    <main className="relative z-10 min-h-[100dvh]">
      <div className="casa-dots pointer-events-none absolute right-0 top-24 h-44 w-44 opacity-[0.07]" />

      {/* Nameplate tabloide */}
      <section className="mx-auto max-w-6xl px-5 pt-12 md:px-10 md:pt-16">
        <div className="flex items-center justify-between border-b-2 border-[var(--ink)] pb-2 casa-body text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--ink-soft)]/70">
          <span>Guias práticos</span>
          <span>Freelandoo · edição contínua</span>
        </div>
        <h1 className="mt-4 casa-display text-[18vw] leading-[0.8] text-[var(--ink)] sm:text-[14vw] md:text-[11rem]">
          O BLOG
        </h1>
        <p className="mt-2 max-w-2xl casa-body text-base font-semibold leading-relaxed text-[var(--ink-soft)]/80 md:text-lg">
          Preço, portfólio, agenda, vendas e vídeo — <span className="casa-hl-magenta casa-hl">direto ao ponto</span> para
          quem vive do próprio trabalho.
        </p>
        <div className="mt-5 h-1.5 w-full bg-[var(--ink)]" />
      </section>

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-10">
        <BlogAdminBar />

        {categories.length > 0 && (
          <nav className="mb-8 flex flex-wrap gap-2">
            <Link
              href="/blog"
              className={`border-2 border-[var(--ink)] px-4 py-1.5 casa-body text-xs font-extrabold uppercase tracking-[0.1em] transition ${
                !category ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-2)]"
              }`}
            >
              Tudo
            </Link>
            {categories.map((c) => (
              <Link
                key={c.category}
                href={catHref(c.category)}
                className={`border-2 border-[var(--ink)] px-4 py-1.5 casa-body text-xs font-extrabold uppercase tracking-[0.1em] transition ${
                  category === c.category ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-2)]"
                }`}
              >
                {c.category}
              </Link>
            ))}
          </nav>
        )}

        {posts.length === 0 ? (
          <div className="border-2 border-dashed border-[var(--ink)]/40 bg-[var(--paper-2)]/40 py-20 text-center">
            <p className="casa-display text-3xl text-[var(--ink)]">Nada por aqui ainda</p>
            <p className="mt-1 casa-body text-sm text-[var(--ink-soft)]/60">Volte em breve — novos guias toda semana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => (
              <PostCard key={post.slug} post={post} idx={i} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            {page > 1 && (
              <Link
                href={`/blog?${new URLSearchParams({ ...(category ? { category } : {}), page: String(page - 1) })}`}
                className="border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] hover:bg-[var(--paper-2)]"
              >
                Anterior
              </Link>
            )}
            <span className="casa-body text-xs font-bold uppercase tracking-wide text-[var(--ink-soft)]/70">
              Pág. {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/blog?${new URLSearchParams({ ...(category ? { category } : {}), page: String(page + 1) })}`}
                className="border-2 border-[var(--ink)] bg-[var(--paper)] px-5 py-2 casa-body text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--ink)] shadow-[3px_3px_0_0_var(--ink)] hover:bg-[var(--paper-2)]"
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
