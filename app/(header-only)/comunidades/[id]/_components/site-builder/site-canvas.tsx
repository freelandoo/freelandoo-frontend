"use client"

// Canvas: o site em si. Renderiza as seções na ordem do array e, para o líder
// em modo de edição, acopla a barra de ações de cada uma.
//
// O MESMO componente serve leitura e edição — não existe "modo preview" com
// outra árvore. Duas árvores divergiriam, e o líder acabaria publicando algo
// diferente do que viu.

import { useCallback } from "react"
import type {
  AboutData,
  CommunitySiteConfig,
  ContactData,
  GalleryData,
  HeroData,
  ServicesCatalogData,
  SiteSection,
  TestimonialsData,
} from "@/types/community-site"
import { InlineText } from "./editable"
import { SiteSectionToolbar } from "./site-section-toolbar"
import { sectionLabel } from "./site-add-section-menu"
import { SectionShell } from "./sections/section-shell"
import { HeroBannerSection } from "./sections/hero-banner-section"
import { ServicesCatalogSection } from "./sections/services-catalog-section"
import { AboutSection } from "./sections/about-section"
import { TestimonialsSection } from "./sections/testimonials-section"
import { GallerySection } from "./sections/gallery-section"
import { ContactSection } from "./sections/contact-section"

export function SiteCanvas({
  config,
  editing,
  onChange,
  onUpload,
  t,
}: {
  config: CommunitySiteConfig
  editing: boolean
  onChange: (next: CommunitySiteConfig) => void
  onUpload: (file: File) => Promise<string | null>
  t: (key: string, fallback: string) => string
}) {
  const { theme, sections } = config

  const patchSection = useCallback(
    (sectionId: string, patch: Partial<SiteSection>) => {
      onChange({
        ...config,
        sections: config.sections.map((s) =>
          s.id === sectionId ? ({ ...s, ...patch } as SiteSection) : s
        ),
      })
    },
    [config, onChange]
  )

  const move = useCallback(
    (index: number, delta: number) => {
      const next = [...config.sections]
      const target = index + delta
      if (target < 0 || target >= next.length) return
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item)
      onChange({ ...config, sections: next })
    },
    [config, onChange]
  )

  const remove = useCallback(
    (sectionId: string) => {
      onChange({ ...config, sections: config.sections.filter((s) => s.id !== sectionId) })
    },
    [config, onChange]
  )

  const visible = editing ? sections : sections.filter((s) => s.enabled)

  return (
    <div
      className="fl-sharp w-full"
      style={{ background: theme.background, color: theme.textPrimary }}
    >
      {/* Cabeçalho do site: nome + tagline. Fora das seções de propósito —
          é a identidade do site, não um bloco que se possa remover. */}
      <header
        className="border-b-2 border-[#0B0B0D] px-5 py-5 md:px-10"
        style={{ background: theme.surface }}
      >
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1">
          <InlineText
            editing={editing}
            value={config.siteName}
            onChange={(v) => onChange({ ...config, siteName: v })}
            placeholder={t("siteNamePlaceholder", "Nome do site")}
            maxLength={120}
            className="fl-display text-2xl leading-none md:text-3xl"
            style={{ color: theme.primary }}
          />
          {(editing || config.tagline) && (
            <InlineText
              editing={editing}
              value={config.tagline}
              onChange={(v) => onChange({ ...config, tagline: v })}
              placeholder={t("taglinePlaceholder", "Uma frase que resume a comunidade")}
              maxLength={240}
              className="text-[11px] font-extrabold uppercase tracking-[0.16em]"
              style={{ color: theme.textSecondary }}
            />
          )}
        </div>
      </header>

      {visible.length === 0 && (
        <div className="px-5 py-20 text-center md:px-10">
          <p className="text-sm" style={{ color: theme.textSecondary }}>
            {editing
              ? t("canvasEmptyEditing", "Adicione a primeira seção pelo botão acima.")
              : t("canvasEmpty", "Este site ainda não tem conteúdo.")}
          </p>
        </div>
      )}

      {visible.map((section) => {
        const index = sections.indexOf(section)
        const body = renderSection(section)

        // Hero desenha o próprio cabeçalho (manchete gigante sobre a foto), então
        // não passa pela SectionShell — que existe para padronizar o resto.
        const content =
          section.kind === "hero" ? (
            body
          ) : (
            <SectionShell
              editing={editing}
              theme={theme}
              title={section.title}
              subtitle={section.subtitle}
              onTitle={(v) => patchSection(section.id, { title: v })}
              onSubtitle={(v) => patchSection(section.id, { subtitle: v })}
              titlePlaceholder={t("sectionTitlePlaceholder", "Título da seção")}
              subtitlePlaceholder={t("sectionSubtitlePlaceholder", "Subtítulo (opcional)")}
            >
              {body}
            </SectionShell>
          )

        if (!editing) return <div key={section.id}>{content}</div>

        return (
          <div
            key={section.id}
            className="relative"
            style={{
              outline: "1px dashed rgba(245,241,232,0.12)",
              outlineOffset: "-1px",
              // Seção oculta continua visível PARA O LÍDER, esmaecida: sumir de
              // vez no modo de edição esconderia que ela existe e ele a
              // recriaria do zero.
              opacity: section.enabled ? 1 : 0.45,
            }}
          >
            <div className="absolute left-3 top-3 z-30">
              <SiteSectionToolbar
                label={sectionLabel(section.kind, t)}
                enabled={section.enabled}
                canMoveUp={index > 0}
                canMoveDown={index < sections.length - 1}
                onMoveUp={() => move(index, -1)}
                onMoveDown={() => move(index, 1)}
                onToggleEnabled={() => patchSection(section.id, { enabled: !section.enabled })}
                onRemove={() => remove(section.id)}
                labels={{
                  moveUp: t("moveUp", "Mover para cima"),
                  moveDown: t("moveDown", "Mover para baixo"),
                  show: t("showSection", "Mostrar seção"),
                  hide: t("hideSection", "Ocultar seção"),
                  remove: t("removeSection", "Remover seção"),
                  confirmRemove: t("confirmRemove", "Remover"),
                  cancel: t("cancel", "Cancelar"),
                }}
              />
            </div>
            {/* Espaço para a barra não cobrir o conteúdo da seção. */}
            <div className="pt-14">{content}</div>
          </div>
        )
      })}
    </div>
  )

  function renderSection(section: SiteSection) {
    const setData = (data: SiteSection["data"]) =>
      patchSection(section.id, { data } as Partial<SiteSection>)

    switch (section.kind) {
      case "hero":
        return (
          <HeroBannerSection
            data={section.data}
            onChange={(d: HeroData) => setData(d)}
            editing={editing}
            theme={theme}
            onUpload={onUpload}
            labels={{
              headline: t("heroHeadline", "Manchete do banner"),
              subheadline: t("heroSubheadline", "Uma linha de apoio"),
              ctaText: t("heroCtaText", "Texto do botão"),
              ctaUrl: t("heroCtaUrl", "Link do botão (https://...)"),
              addSlide: t("heroAddSlide", "Novo banner"),
              removeSlide: t("heroRemoveSlide", "Remover banner"),
              changeImage: t("changeImage", "Trocar imagem"),
              framing: t("framing", "Enquadramento"),
              removeImage: t("removeImage", "Remover imagem"),
              imageHint: t("imageHint", "Clique para enviar uma imagem"),
              prev: t("prev", "Anterior"),
              next: t("next", "Próximo"),
            }}
          />
        )

      case "services_catalog":
        return (
          <ServicesCatalogSection
            data={section.data}
            onChange={(d: ServicesCatalogData) => setData(d)}
            editing={editing}
            theme={theme}
            onUpload={onUpload}
            labels={{
              title: t("serviceTitle", "Nome do serviço"),
              description: t("serviceDescription", "O que está incluso"),
              price: t("servicePrice", "R$ 0,00"),
              duration: t("serviceDuration", "Duração"),
              ctaText: t("serviceCtaText", "Texto do botão"),
              ctaUrl: t("serviceCtaUrl", "Link do botão"),
              addItem: t("serviceAdd", "Adicionar serviço"),
              removeItem: t("serviceRemove", "Remover serviço"),
              changeImage: t("changeImage", "Trocar imagem"),
              framing: t("framing", "Enquadramento"),
              removeImage: t("removeImage", "Remover imagem"),
              imageHint: t("imageHint", "Clique para enviar uma imagem"),
              empty: t("serviceEmpty", "Nenhum serviço cadastrado ainda."),
              columns: t("columns", "Colunas"),
            }}
          />
        )

      case "about":
        return (
          <AboutSection
            data={section.data}
            onChange={(d: AboutData) => setData(d)}
            editing={editing}
            theme={theme}
            onUpload={onUpload}
            labels={{
              body: t("aboutBody", "Conte a história da comunidade."),
              highlightTitle: t("aboutHighlightTitle", "Título do destaque"),
              highlightDescription: t("aboutHighlightDescription", "Uma linha explicando"),
              addHighlight: t("aboutAddHighlight", "Novo destaque"),
              removeHighlight: t("aboutRemoveHighlight", "Remover destaque"),
              addPhoto: t("aboutAddPhoto", "Nova foto"),
              removePhoto: t("removePhoto", "Remover foto"),
              changeImage: t("changeImage", "Trocar imagem"),
              framing: t("framing", "Enquadramento"),
              removeImage: t("removeImage", "Remover imagem"),
              imageHint: t("imageHint", "Clique para enviar uma imagem"),
            }}
          />
        )

      case "testimonials":
        return (
          <TestimonialsSection
            data={section.data}
            onChange={(d: TestimonialsData) => setData(d)}
            editing={editing}
            theme={theme}
            onUpload={onUpload}
            labels={{
              name: t("testimonialName", "Nome"),
              role: t("testimonialRole", "Quem é (opcional)"),
              text: t("testimonialText", "O que essa pessoa disse"),
              addItem: t("testimonialAdd", "Novo depoimento"),
              removeItem: t("testimonialRemove", "Remover depoimento"),
              changeImage: t("changeImage", "Trocar imagem"),
              framing: t("framing", "Enquadramento"),
              removeImage: t("removeImage", "Remover imagem"),
              ratingLabel: t("testimonialRating", "Nota"),
              empty: t("testimonialEmpty", "Nenhum depoimento ainda."),
            }}
          />
        )

      case "gallery":
        return (
          <GallerySection
            data={section.data}
            onChange={(d: GalleryData) => setData(d)}
            editing={editing}
            theme={theme}
            onUpload={onUpload}
            labels={{
              caption: t("galleryCaption", "Legenda (opcional)"),
              addPhoto: t("galleryAdd", "Nova foto"),
              removePhoto: t("removePhoto", "Remover foto"),
              changeImage: t("changeImage", "Trocar imagem"),
              framing: t("framing", "Enquadramento"),
              removeImage: t("removeImage", "Remover imagem"),
              imageHint: t("imageHint", "Clique para enviar uma imagem"),
              columns: t("columns", "Colunas"),
              empty: t("galleryEmpty", "Nenhuma foto ainda."),
            }}
          />
        )

      case "contact":
        return (
          <ContactSection
            data={section.data}
            onChange={(d: ContactData) => setData(d)}
            editing={editing}
            theme={theme}
            labels={{
              address: t("contactAddress", "Rua, número, bairro, cidade"),
              mapsUrl: t("contactMapsUrl", "Link do Google Maps"),
              whatsapp: t("contactWhatsapp", "WhatsApp com DDD"),
              email: t("contactEmail", "E-mail de contato"),
              hours: t("contactHours", "Horário de funcionamento"),
              socialLabel: t("contactSocialLabel", "Rede"),
              socialUrl: t("contactSocialUrl", "Link do perfil"),
              addSocial: t("contactAddSocial", "Nova rede"),
              removeSocial: t("contactRemoveSocial", "Remover rede"),
              openMaps: t("contactOpenMaps", "Abrir no mapa"),
              talkWhatsapp: t("contactTalkWhatsapp", "Falar no WhatsApp"),
              empty: t("contactEmpty", "Sem informações de contato."),
            }}
          />
        )
    }
  }
}
