"use client"

// Casca comum de toda seção: eyebrow, título, subtítulo e o ritmo vertical.
//
// Existe para que a próxima seção não precise redecidir tipografia nem
// espaçamento — o que mantém o site inteiro parecendo UM site, e não seis
// blocos empilhados com estilos parecidos.
//
// ═══ O CABEÇALHO TEM TRÊS DEGRAUS, E É ISSO QUE DÁ A LEITURA ═══
//
//   eyebrow  → de que assunto é este bloco ("Sobre nós", "Depoimentos")
//   título   → a frase que o líder quer que a pessoa leia ("Aqui você não é
//              só mais um.")
//   subtítulo→ a linha de apoio
//
// O eyebrow é DERIVADO do tipo da seção, não é um campo. Ele responde sempre a
// mesma pergunta ("que bloco é este?") e a resposta já está no documento — um
// campo a mais só criaria a chance de o líder escrever ali algo que contradiz
// a seção em que está. Como é derivado, ele também traduz sozinho.

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
  /** Rótulo do tipo da seção, desenhado acima do título. */
  eyebrow,
  /** Blocos que são um destaque no meio da página abrem centralizados. */
  align = "left",
  /** Seções que desenham o próprio cabeçalho (hero, pessoa) escondem o daqui. */
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
  eyebrow?: string
  align?: "left" | "center"
  hideHeader?: boolean
}) {
  // Em leitura, um título vazio não deve deixar buraco no ritmo da página.
  const showHeader = !hideHeader && (editing || title || subtitle)
  const layout = useSectionLayout()
  const centered = align === "center"

  return (
    <section
      className="px-5 py-16 md:px-10 md:py-24"
      // O respiro escolhido na alça da linha divisória VENCE as classes — é ele
      // que deixa a seção encostar no conteúdo. `null` mantém o do CSS, que é
      // responsivo (py-16 no celular, py-24 no computador); um número fixo por
      // padrão congelaria isso para todo mundo.
      style={
        layout?.padY !== null && layout?.padY !== undefined
          ? { paddingTop: layout.padY, paddingBottom: layout.padY }
          : undefined
      }
    >
      {/* A largura da coluna é a que o líder deixou na alça; sem alça, o
          max-w-6xl de sempre — e a classe continua no lugar para o site nunca
          ficar sem teto de largura. */}
      <div
        className="mx-auto w-full max-w-6xl"
        style={layout?.maxWidth ? { maxWidth: layout.maxWidth } : undefined}
      >
        {showHeader && (
          <header className={`mb-10 md:mb-14 ${centered ? "text-center" : ""}`}>
            {eyebrow && (
              <span
                className="mb-4 block text-[11px] font-extrabold uppercase tracking-[0.24em]"
                style={{ color: theme.primary }}
              >
                {eyebrow}
              </span>
            )}
            <InlineText
              as="h2"
              editing={editing}
              value={title}
              onChange={onTitle}
              styleKey="title"
              placeholder={titlePlaceholder}
              maxLength={120}
              className="fl-display text-4xl uppercase leading-[0.92] tracking-[0.02em] md:text-6xl lg:text-7xl"
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
                className={`mt-5 max-w-2xl text-base leading-relaxed md:text-lg ${
                  centered ? "mx-auto" : ""
                }`}
                style={{ color: theme.textSecondary }}
              />
            )}
          </header>
        )}
        {children}
      </div>
    </section>
  )
}
