"use client"

// Casca comum de toda seção: título, subtítulo e o espaçamento vertical.
//
// Existe para que a próxima seção não precise redecidir tipografia nem ritmo —
// o que mantém o site inteiro parecendo UM site, e não seis blocos empilhados
// com estilos parecidos.

import type { SiteColorTheme } from "@/types/community-site"
import { InlineText } from "../editable"
import { useSectionLayout } from "../site-style-context"

export function SectionShell({
  title,
  subtitle,
  onTitle,
  onSubtitle,
  editing,
  theme,
  children,
  titlePlaceholder,
  subtitlePlaceholder,
  /** Seções que desenham o próprio cabeçalho (hero) escondem o daqui. */
  hideHeader = false,
}: {
  title: string
  subtitle: string
  onTitle: (v: string) => void
  onSubtitle: (v: string) => void
  editing: boolean
  theme: SiteColorTheme
  children: React.ReactNode
  titlePlaceholder: string
  subtitlePlaceholder: string
  hideHeader?: boolean
}) {
  // Em leitura, um título vazio não deve deixar buraco no ritmo da página.
  const showHeader = !hideHeader && (editing || title || subtitle)
  const layout = useSectionLayout()

  return (
    <section className="px-5 py-12 md:px-10 md:py-16">
      {/* A largura da coluna é a que o líder deixou na alça; sem alça, o
          max-w-6xl de sempre — e a classe continua no lugar para o site nunca
          ficar sem teto de largura. */}
      <div
        className="mx-auto w-full max-w-6xl"
        style={layout?.maxWidth ? { maxWidth: layout.maxWidth } : undefined}
      >
        {showHeader && (
          <header className="mb-8">
            <InlineText
              as="h2"
              editing={editing}
              value={title}
              onChange={onTitle}
              styleKey="title"
              placeholder={titlePlaceholder}
              maxLength={120}
              className="fl-display text-3xl leading-none md:text-5xl"
              style={{ color: theme.textPrimary }}
            />
            {(editing || subtitle) && (
              <InlineText
                as="p"
                editing={editing}
                value={subtitle}
                onChange={onSubtitle}
                styleKey="subtitle"
                placeholder={subtitlePlaceholder}
                maxLength={240}
                className="mt-2 max-w-2xl text-sm leading-relaxed"
                style={{ color: theme.textSecondary }}
              />
            )}
            <div className="mt-4 h-1 w-16" style={{ background: theme.primary }} />
          </header>
        )}
        {children}
      </div>
    </section>
  )
}
