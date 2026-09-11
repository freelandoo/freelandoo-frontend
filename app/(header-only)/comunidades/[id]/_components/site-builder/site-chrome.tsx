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
import type {
  CommunitySiteConfig,
  SiteColorTheme,
  SitePage,
  SiteSection,
} from "@/types/community-site"
import { sectionHasContent, type SectionContentContext } from "./section-content"
import { InlineText } from "./editable"
import { isExternalHref, useSiteHref } from "./site-runtime"

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
  /**
   * Itens do menu.
   *
   * `href` ausente = ÂNCORA para uma seção desta mesma página (o que o menu
   * sempre foi). `href` presente = navegação de verdade, para outra página do
   * site (mig 238) ou de volta para a home.
   */
  navItems: { id: string; label: string; href?: string }[]
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
/**
 * Quantas ÂNCORAS o menu mostra quando o site não tem sub-página. Mantido em 5
 * para não mexer na barra de quem já publicou.
 */
const MAX_ANCHORS = 5
/** E quantas sub-páginas. Acima disso a barra deixa de ser legível. */
const MAX_NAV_PAGES = 4

/**
 * Navegação entre páginas do site (mig 238). Opcional: sem isso o menu é o de
 * sempre, só com as âncoras da página atual.
 */
export type SiteChromeNav = {
  pages: SitePage[]
  /** A página aberta agora, para ela não virar um link para si mesma. */
  activePageSlug: string | null
  /** Onde as sub-páginas respondem. `null` = não há para onde ir. */
  pageBase: string | null
  /** O caminho de volta. `null` no construtor antes da primeira publicação. */
  homeHref: string | null
  /** Rótulo do item de volta — vem de quem tem o dicionário. */
  homeLabel: string
}

export function useSiteChromeInfo(
  config: CommunitySiteConfig,
  editing: boolean,
  ctx: SectionContentContext,
  nav?: SiteChromeNav,
  /**
   * As seções da HOME, quando a pilha na tela é de uma sub-página (mig 238).
   *
   * ⚠️ Sem isto a casca perde o CONTATO dentro de uma sub-página, e em
   * silêncio: quem monta o canvas entrega `config` com `sections` trocadas
   * pelas da página, e a seção de contato só existe na home — então
   * `whatsapp` e `socials` saíam vazios, e as três peças que os leem (o
   * botão da barra, as redes do rodapé e o botão FLUTUANTE) simplesmente não
   * eram desenhadas. Justamente na página de cidade, que é a que responde em
   * busca local e por onde o cliente chega.
   *
   * Vale só para o que é do SITE INTEIRO. As âncoras continuam saindo da
   * página aberta — elas respondem "o que tem AQUI".
   */
  homeSections?: SiteSection[]
): SiteChromeInfo {
  return useMemo(() => {
    // A MESMA régua que a página usa para desenhar. O menu não pode oferecer
    // uma âncora para a seção que ficou de fora por estar vazia — o clique
    // rolaria para um ponto que não existe. No construtor a seção vazia ainda
    // está lá, então ela continua no menu.
    const enabled = config.sections.filter(
      (s) => s.enabled && (editing || sectionHasContent(s, ctx))
    )
    // O que é do site inteiro sai da home; na home as duas listas são a mesma.
    const shared = homeSections
      ? homeSections.filter((s) => s.enabled && (editing || sectionHasContent(s, ctx)))
      : enabled
    const contact = shared.find(
      (s): s is Extract<SiteSection, { kind: "contact" }> => s.kind === "contact"
    )
    // A ação é da PÁGINA quando ela tem banner próprio — ali o CTA é o daquele
    // assunto. Sub-página sem banner cai no da home, em vez de ficar sem botão.
    const heroOf = (list: SiteSection[]) =>
      list.find((s): s is Extract<SiteSection, { kind: "hero" }> => s.kind === "hero")?.data
        .slides[0]
    const own = heroOf(enabled)
    const firstSlide = own?.ctaText && own.ctaUrl ? own : heroOf(shared)

    // ⚠️ As SUB-PÁGINAS entram no menu, e sem isso a feature nasceria pela
    // metade: uma página criada não teria como ser alcançada — nem pelo
    // visitante nem pelo buscador, que descobre página por link. Página
    // desligada fica de fora (é rascunho), e a página aberta também (seria um
    // link para si mesma).
    const navPages =
      nav && nav.pageBase !== null
        ? nav.pages
            .filter((p) => p.enabled && p.slug !== nav.activePageSlug)
            .slice(0, MAX_NAV_PAGES)
            .map((p) => ({
              id: `page:${p.id}`,
              label: (p.title || p.slug).trim(),
              href: `${nav.pageBase}/${p.slug}`,
            }))
        : []

    // Dentro de uma sub-página, o primeiro item é a volta. Fora do teto de
    // propósito: é o caminho mais usado de todos, e perdê-lo para dar lugar a
    // uma âncora deixaria o visitante sem saída.
    const homeItem =
      nav && nav.activePageSlug && nav.homeHref
        ? [{ id: "page:home", label: nav.homeLabel, href: nav.homeHref }]
        : []

    // As âncoras cedem espaço às páginas — destino vale mais que atalho —, mas
    // nunca abaixo de duas: um site com muitas páginas continua precisando
    // apontar o que tem na página que está aberta.
    const anchorRoom = navPages.length
      ? Math.max(2, MAX_ANCHORS - navPages.length)
      : MAX_ANCHORS

    return {
      // O banner é o topo da página: ancorar nele seria um link para "aqui".
      navItems: [
        ...homeItem,
        ...enabled
          .filter((s) => s.kind !== "hero" && s.title.trim())
          .slice(0, anchorRoom)
          .map((s) => ({ id: s.id, label: s.title.trim() })),
        ...navPages,
      ],
      whatsapp: contact?.data.whatsapp || "",
      socials: (contact?.data.socials || []).filter((s) => s.url),
      action:
        firstSlide?.ctaText && firstSlide.ctaUrl
          ? { text: firstSlide.ctaText, url: firstSlide.ctaUrl }
          : null,
    }
  }, [config, editing, ctx, nav, homeSections])
}

/** Link externo abre em aba nova; âncora e caminho interno, não. */
function linkTarget(url: string) {
  return isExternalHref(url)
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
  // O botão de ação da barra é herdado do primeiro banner, então herda também o
  // token de agendar — e é aqui que ele vira endereço. `null` = sem botão: uma
  // barra com botão que não leva a lugar nenhum é pior do que uma barra sem
  // botão.
  const actionHref = useSiteHref(info.action?.url || "")

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
              href={item.href || `#${sectionAnchor(item.id)}`}
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
          {info.action && actionHref && (
            <a
              href={actionHref}
              {...linkTarget(actionHref)}
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
              href={item.href || `#${sectionAnchor(item.id)}`}
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
          {info.action && actionHref && (
            <a
              href={actionHref}
              {...linkTarget(actionHref)}
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
                  href={item.href || `#${sectionAnchor(item.id)}`}
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
