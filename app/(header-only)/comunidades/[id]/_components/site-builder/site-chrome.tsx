"use client"

// Casca do site: barra de navegação, rodapé e botão flutuante de WhatsApp.
//
// ═══ NADA AQUI É UMA SEÇÃO, E NADA AQUI GUARDA CONTEÚDO PRÓPRIO ═══
//
// A composição de referência abre com uma barra fixa (logo, âncoras, WhatsApp
// e um botão de ação) e fecha com um rodapé — as duas peças que fazem o
// visitante entender que aquilo é um SITE, e não uma página solta. Só que
// nenhuma das duas tem texto que já não exista em outro lugar do documento:
//
//   logo e assinatura → `siteName` / `tagline`
//   âncoras           → o título das seções habilitadas
//   WhatsApp e redes  → a seção de contato
//   botão de ação     → o CTA do primeiro banner
//
// Por isso são DERIVADAS, e não campos novos. Guardá-las seria criar uma
// segunda verdade: o líder trocaria o WhatsApp na seção de contato e o botão
// flutuante continuaria ligando para o número velho, sem erro nenhum aparecer.

import { useEffect, useMemo, useState } from "react"
import { Menu, MessageCircle, X } from "lucide-react"
import type { CommunitySiteConfig, SiteColorTheme, SiteSection } from "@/types/community-site"
import { sectionHasContent, type SectionContentContext } from "./section-content"
import { InlineText } from "./editable"

/**
 * WhatsApp digitado → link do wa.me.
 *
 * Só dígitos: "(11) 96275-7599" e "+55 11 96275 7599" têm que virar o mesmo
 * link, e wa.me não aceita pontuação.
 */
export function whatsappHref(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "")
  if (digits.length < 8) return ""
  return `https://wa.me/${digits}`
}

/** Âncora de uma seção. O id já vem do alfabeto seguro do backend. */
export function sectionAnchor(id: string): string {
  return `sec-${id}`
}

export type SiteChromeInfo = {
  /** Itens do menu: seções habilitadas que têm título. */
  navItems: { id: string; label: string }[]
  whatsapp: string
  socials: { id: string; label: string; url: string }[]
  /** Ação principal, herdada do primeiro banner. */
  action: { text: string; url: string } | null
}

/**
 * Lê do documento o que a casca precisa. Fica fora dos componentes porque as
 * três peças (barra, rodapé, botão) leem exatamente a mesma coisa — e uma
 * leitura por peça é como elas começariam a divergir.
 */
export function useSiteChromeInfo(
  config: CommunitySiteConfig,
  editing: boolean,
  ctx: SectionContentContext
): SiteChromeInfo {
  return useMemo(() => {
    // A MESMA régua que a página usa para desenhar. O menu não pode oferecer
    // uma âncora para a seção que ficou de fora por estar vazia — o clique
    // rolaria para um ponto que não existe. No construtor a seção vazia ainda
    // está lá, então ela continua no menu.
    const enabled = config.sections.filter(
      (s) => s.enabled && (editing || sectionHasContent(s, ctx))
    )
    const contact = enabled.find(
      (s): s is Extract<SiteSection, { kind: "contact" }> => s.kind === "contact"
    )
    const hero = enabled.find((s): s is Extract<SiteSection, { kind: "hero" }> => s.kind === "hero")
    const firstSlide = hero?.data.slides[0]

    return {
      // O banner é o topo da página: ancorar nele seria um link para "aqui".
      navItems: enabled
        .filter((s) => s.kind !== "hero" && s.title.trim())
        .slice(0, 5)
        .map((s) => ({ id: s.id, label: s.title.trim() })),
      whatsapp: contact?.data.whatsapp || "",
      socials: (contact?.data.socials || []).filter((s) => s.url),
      action:
        firstSlide?.ctaText && firstSlide.ctaUrl
          ? { text: firstSlide.ctaText, url: firstSlide.ctaUrl }
          : null,
    }
  }, [config, editing, ctx])
}

/** Link externo abre em aba nova; âncora e caminho interno, não. */
function linkTarget(url: string) {
  return url.startsWith("http")
    ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
    : ({} as const)
}

// ─── Barra de navegação ─────────────────────────────────────────────────────

export function SiteNav({
  config,
  info,
  theme,
  editing,
  onChangeSiteName,
  labels,
}: {
  config: CommunitySiteConfig
  info: SiteChromeInfo
  theme: SiteColorTheme
  editing: boolean
  /** O nome do site é editado AQUI: a barra é o único lugar em que ele aparece. */
  onChangeSiteName: (v: string) => void
  labels: { openMenu: string; closeMenu: string; whatsapp: string; siteName: string }
}) {
  // Transparente sobre o banner e sólida depois que a página rola — é o que
  // deixa a manchete ocupar a tela inteira sem uma faixa cortando o topo.
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (editing) return
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [editing])

  // No construtor ela NÃO é fixa: a prancheta tem zoom por pizca, e `fixed`
  // dentro de um ancestral com `transform` deixa de ser fixo na janela — a
  // barra descolaria do site que o líder está editando.
  const solidNow = editing || solid
  const wa = whatsappHref(info.whatsapp)

  return (
    <header
      className={`${editing ? "relative" : "fixed inset-x-0 top-0"} z-40 transition-colors duration-300`}
      style={{
        background: solidNow ? theme.surface : "transparent",
        borderBottom: `2px solid ${solidNow ? theme.background : "transparent"}`,
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-10">
        {/* O nome do site vive na barra, e é aqui que o líder o edita — a
            mesma caixa que o visitante lê. Uma faixa de edição separada seria
            um segundo lugar mostrando o mesmo texto. */}
        <InlineText
          editing={editing}
          value={config.siteName}
          onChange={onChangeSiteName}
          styleKey="site.name"
          placeholder={labels.siteName}
          maxLength={120}
          className="fl-display shrink-0 text-xl leading-none tracking-[0.12em] md:text-2xl"
          style={{ color: theme.primary }}
        />

        <nav className="hidden items-center gap-7 md:flex">
          {info.navItems.map((item) => (
            <a
              key={item.id}
              href={`#${sectionAnchor(item.id)}`}
              className="text-[11px] font-extrabold uppercase tracking-[0.14em] transition-opacity hover:opacity-70"
              style={{ color: theme.textSecondary }}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border-2 px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em]"
              style={{ borderColor: theme.primary, color: theme.primary }}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              {labels.whatsapp}
            </a>
          )}
          {info.action && (
            <a
              href={info.action.url}
              {...linkTarget(info.action.url)}
              className="inline-block border-2 px-5 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em]"
              style={{
                background: theme.primary,
                color: theme.background,
                borderColor: theme.background,
              }}
            >
              {info.action.text}
            </a>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? labels.closeMenu : labels.openMenu}
          aria-expanded={open}
          className="grid h-9 w-9 shrink-0 place-items-center border-2 md:hidden"
          style={{
            borderColor: theme.background,
            color: theme.textPrimary,
            background: theme.surface,
          }}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div
          className="flex flex-col gap-1 border-t-2 px-5 pb-4 md:hidden"
          style={{ background: theme.surface, borderColor: theme.background }}
        >
          {info.navItems.map((item) => (
            <a
              key={item.id}
              href={`#${sectionAnchor(item.id)}`}
              onClick={() => setOpen(false)}
              className="py-2 text-xs font-extrabold uppercase tracking-[0.12em]"
              style={{ color: theme.textSecondary }}
            >
              {item.label}
            </a>
          ))}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-1.5 border-2 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em]"
              style={{ borderColor: theme.primary, color: theme.primary }}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              {labels.whatsapp}
            </a>
          )}
          {info.action && (
            <a
              href={info.action.url}
              {...linkTarget(info.action.url)}
              className="mt-1 block border-2 px-4 py-2 text-center text-[11px] font-extrabold uppercase tracking-[0.12em]"
              style={{
                background: theme.primary,
                color: theme.background,
                borderColor: theme.background,
              }}
            >
              {info.action.text}
            </a>
          )}
        </div>
      )}
    </header>
  )
}

// ─── Rodapé ─────────────────────────────────────────────────────────────────

export function SiteFooter({
  config,
  info,
  theme,
  editing,
  onChangeTagline,
  labels,
}: {
  config: CommunitySiteConfig
  info: SiteChromeInfo
  theme: SiteColorTheme
  editing: boolean
  /** A assinatura só aparece no rodapé, então é lá que ela é escrita. */
  onChangeTagline: (v: string) => void
  labels: { rights: string; tagline: string }
}) {
  // Ano montado no render, não gravado: um rodapé com o ano congelado envelhece
  // sozinho e faz o site parecer abandonado.
  const year = new Date().getFullYear()

  return (
    <footer
      className="border-t-2 px-5 py-10 md:px-10"
      style={{ background: theme.background, borderColor: theme.surface }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-start md:justify-between md:text-left">
          <div>
            <span
              className="fl-display block text-xl leading-none tracking-[0.12em]"
              style={{ color: theme.primary }}
            >
              {config.siteName}
            </span>
            {(editing || config.tagline) && (
              <InlineText
                as="p"
                editing={editing}
                value={config.tagline}
                onChange={onChangeTagline}
                styleKey="site.tagline"
                placeholder={labels.tagline}
                maxLength={240}
                className="mt-2 max-w-xs text-[11px] leading-relaxed"
                style={{ color: theme.textSecondary }}
              />
            )}
          </div>

          {info.navItems.length > 0 && (
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {info.navItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${sectionAnchor(item.id)}`}
                  className="text-[11px] font-extrabold uppercase tracking-[0.12em] transition-opacity hover:opacity-70"
                  style={{ color: theme.textSecondary }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}

          {info.socials.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {info.socials.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.12em] transition-opacity hover:opacity-70"
                  style={{ borderColor: theme.surface, color: theme.textSecondary }}
                >
                  {s.label || s.url}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="border-t-2 pt-5 text-center" style={{ borderColor: theme.surface }}>
          <p className="text-[11px]" style={{ color: theme.textSecondary }}>
            © {year} {config.siteName}. {labels.rights}
          </p>
        </div>
      </div>
    </footer>
  )
}

// ─── Botão flutuante de WhatsApp ────────────────────────────────────────────

export function SiteWhatsAppFab({
  info,
  theme,
  label,
}: {
  info: SiteChromeInfo
  theme: SiteColorTheme
  label: string
}) {
  const href = whatsappHref(info.whatsapp)
  // Sem número não há botão. Um atalho que não leva a lugar nenhum é pior do
  // que a ausência dele, porque só se descobre depois do clique.
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center border-2 transition-transform hover:scale-105 md:bottom-8 md:right-8"
      style={{
        background: theme.primary,
        color: theme.background,
        borderColor: theme.background,
        boxShadow: `4px 4px 0 0 ${theme.background}`,
        // A barra de gestos do iPhone come o canto inferior: sem isto o botão
        // nasce em cima dela e metade do alvo não é clicável.
        marginBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
