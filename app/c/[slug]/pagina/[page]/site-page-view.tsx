"use client"

// Uma SUB-PÁGINA do site publicado (mig 238).
//
// Existe pela mesma razão técnica do `public-site-view`: o `SiteCanvas` recebe
// o tradutor `t` como prop e precisa de hooks, então alguém client tem que
// montá-lo. É o MESMO canvas do construtor, com `editing={false}` — não há
// árvore de leitura separada, para o líder não publicar algo diferente do que
// viu.
//
// O que muda em relação à home: o canvas recebe as seções DESTA página, e não
// as da home. Todo o resto — tema, tamanhos de texto, barra e rodapé — continua
// vindo do documento, que é um só para o site inteiro.

import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { SiteCanvas } from "@/app/(header-only)/comunidades/[id]/_components/site-builder/site-canvas"
import type { CommunitySiteConfig, ShowcaseService, SitePage } from "@/types/community-site"

export function SitePageView({
  config,
  page,
  services,
  providerHref = null,
  bookingHref = null,
  pageBase = null,
  homeHref = null,
  communityId = null,
}: {
  config: CommunitySiteConfig
  page: SitePage
  services?: ShowcaseService[]
  providerHref?: string | null
  bookingHref?: string | null
  pageBase?: string | null
  /**
   * O caminho da home deste site. Vai para o menu como item de volta nas
   * sub-páginas (mig 238).
   */
  homeHref?: string | null
  communityId?: string | null
}) {
  const t = useTranslations("CommunitySite")
  const locale = useLocale()

  return (
    <SiteCanvas
      // ⚠️ O documento inteiro, com `sections` TROCADAS pelas desta página.
      // A barra de navegação e o rodapé são derivados do documento (nome,
      // contato, menu), então passar só a página perderia a casca.
      config={{ ...config, sections: page.sections }}
      onChange={() => {}}
      editing={false}
      t={t}
      locale={locale}
      services={services}
      providerHref={providerHref}
      bookingHref={bookingHref}
      pageBase={pageBase}
      homeHref={homeHref}
      // As outras páginas, e qual é esta — é o que faz o menu trazer o item de
      // volta para a home e não listar um link para a página já aberta.
      pages={config.pages || []}
      activePageSlug={page.slug}
      communityId={communityId}
      onUpload={async () => null}
    />
  )
}
