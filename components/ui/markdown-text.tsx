"use client"

import { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { cn } from "@/lib/utils"

const ALLOWED_ELEMENTS = [
  "p",
  "strong",
  "em",
  "a",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "br",
  "del",
  "hr",
]

const SANITIZE_SCHEMA = {
  ...defaultSchema,
  tagNames: ALLOWED_ELEMENTS,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a || []),
      ["target"],
      ["rel"],
    ],
  },
}

interface MarkdownTextProps {
  /** Texto-fonte em markdown. */
  children: string
  /** Classes extras aplicadas ao wrapper. */
  className?: string
  /**
   * Quando true (default), aplica a tipografia "prose" do Tailwind invertida
   * (tema dark). Desative em superfícies claras (ex.: bubbles do "self" no
   * chat) e passe `className` próprio.
   */
  prose?: boolean
}

/**
 * Render markdown sanitizado. allowedElements = lista curta segura,
 * <a> recebe target="_blank" rel="noopener noreferrer".
 *
 * Não aplicar em: display_name de subperfil, formulários e campos básicos
 * (cidade, UF, profissão).
 */
function MarkdownTextImpl({ children, className, prose = true }: MarkdownTextProps) {
  if (!children || typeof children !== "string") return null

  return (
    <div
      className={cn(
        prose && "prose prose-sm prose-invert max-w-none",
        // ajustes de leitura: links amarelos, code com fundo sutil
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
        "[&_pre]:rounded-lg [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:text-xs",
        "[&_ul]:my-1 [&_ol]:my-1 [&_p]:my-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, SANITIZE_SCHEMA]]}
        allowedElements={ALLOWED_ELEMENTS}
        components={{
          a: ({ href, children: anchorChildren, ...rest }) => (
            <a
              {...rest}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {anchorChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

export const MarkdownText = memo(MarkdownTextImpl)
