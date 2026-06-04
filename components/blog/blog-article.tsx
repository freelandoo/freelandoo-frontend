"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"

// Conteúdo é escrito apenas pelo admin (confiável), mas ainda sanitizamos por
// segurança. Lista de tags voltada a artigos longos (inclui imagens e títulos).
const ALLOWED_ELEMENTS = [
  "p", "strong", "em", "a", "code", "pre", "ul", "ol", "li", "blockquote",
  "h2", "h3", "h4", "br", "del", "hr", "img", "figure", "figcaption", "table",
  "thead", "tbody", "tr", "th", "td",
]

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: ALLOWED_ELEMENTS,
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a || []), ["target"], ["rel"]],
    img: [...(defaultSchema.attributes?.img || []), ["src"], ["alt"], ["title"], ["loading"]],
  },
}

function BlogArticleImpl({ markdown }: { markdown: string }) {
  if (!markdown || typeof markdown !== "string") return null
  return (
    <div
      className={[
        "prose prose-zinc max-w-none",
        "prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-zinc-900",
        "prose-h2:mt-10 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl",
        "prose-p:leading-relaxed prose-p:text-zinc-700",
        "prose-li:text-zinc-700 prose-li:marker:text-amber-500",
        "prose-a:text-amber-700 prose-a:font-medium hover:prose-a:text-amber-800",
        "prose-strong:text-zinc-900",
        "prose-blockquote:border-l-amber-400 prose-blockquote:bg-amber-50/60 prose-blockquote:py-1 prose-blockquote:not-italic prose-blockquote:text-zinc-800",
        "prose-img:rounded-2xl prose-img:border prose-img:border-zinc-200",
        "prose-hr:border-zinc-200",
      ].join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, SANITIZE_SCHEMA]]}
        allowedElements={ALLOWED_ELEMENTS}
        components={{
          a: ({ href, children, ...rest }) => {
            const external = typeof href === "string" && /^https?:\/\//.test(href)
            return (
              <a
                {...rest}
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {children}
              </a>
            )
          },
          // eslint-disable-next-line @next/next/no-img-element
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt || ""} loading="lazy" />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

export const BlogArticle = memo(BlogArticleImpl)
