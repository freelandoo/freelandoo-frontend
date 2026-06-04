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
        "prose max-w-none casa-body",
        // Títulos das seções em Anton (display tabloide)
        "[&_h2]:casa-display [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-[var(--ink)] [&_h2]:text-3xl [&_h2]:leading-[0.95]",
        "[&_h3]:casa-display [&_h3]:mt-9 [&_h3]:mb-2 [&_h3]:text-[var(--ink)] [&_h3]:text-2xl [&_h3]:leading-[0.95]",
        "[&_h4]:casa-body [&_h4]:font-extrabold [&_h4]:uppercase [&_h4]:tracking-wide [&_h4]:text-[var(--ink)]",
        // Corpo
        "[&_p]:casa-body [&_p]:text-[var(--ink-soft)] [&_p]:leading-[1.75]",
        "[&_li]:casa-body [&_li]:text-[var(--ink-soft)] [&_li]:marker:text-[var(--magenta)]",
        "[&_strong]:text-[var(--ink)] [&_strong]:font-extrabold",
        "[&_a]:text-[var(--magenta-deep)] [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[var(--magenta)]",
        // Citação tabloide
        "[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--magenta)] [&_blockquote]:bg-[var(--paper-2)]/60 [&_blockquote]:px-4 [&_blockquote]:py-1 [&_blockquote]:not-italic [&_blockquote]:text-[var(--ink)] [&_blockquote]:font-semibold",
        "[&_img]:border-2 [&_img]:border-[var(--ink)] [&_img]:shadow-[6px_6px_0_0_var(--ink)]",
        "[&_hr]:border-t-2 [&_hr]:border-[var(--ink)]/20",
        "[&_code]:bg-[var(--ink)]/8 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[var(--ink)]",
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
