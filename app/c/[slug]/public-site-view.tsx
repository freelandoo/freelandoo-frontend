"use client"

// Casca client do site público.
//
// Existe por uma razão só, e é técnica: `SiteCanvas` recebe o tradutor `t` como
// PROP, e função não atravessa a fronteira server→client. Então quem chama o
// hook e repassa é este componente — a página continua sendo server component,
// com metadata e ISR, que é o que interessa para buscador e custo.
//
// É o MESMO canvas do construtor, com `editing={false}`. Não existe um
// "renderizador de leitura" separado: dois renderizadores divergiriam, e o
// líder publicaria algo diferente do que viu ao editar.

import { useLocale, useTranslations } from "@/components/i18n/I18nProvider"
import { SiteCanvas } from "@/app/(header-only)/comunidades/[id]/_components/site-builder/site-canvas"
import { SiteAnalytics } from "@/components/site/site-analytics"
import type { CommunitySiteConfig, ShowcaseService } from "@/types/community-site"

export function PublicSiteView({
  config,
  services = [],
  providerHref = null,
  bookingHref = null,
  pageBase = null,
  homeHref = null,
  communityId = null,
}: {
  config: CommunitySiteConfig
  services?: ShowcaseService[]
  /** Perfil onde os serviços da vitrine são contratados. */
  providerHref?: string | null
  /**
   * Endereço da página de agendamento DESTE site. Quem o monta é a página, que
   * sabe se estamos em /c/<slug>, num subdomínio ou no domínio do cliente — o
   * documento guarda só o token `agendar`.
   */
  bookingHref?: string | null
  pageBase?: string | null
  /**
   * O caminho da home deste site. Vai para o menu como item de volta nas
   * sub-páginas (mig 238).
   */
  homeHref?: string | null
  /** A comunidade, para o cartão de chamada perguntar o próximo horário livre. */
  communityId?: string | null
}) {
  const t = useTranslations("CommunitySite")
  const locale = useLocale()

  return (
    <>
      {/* O contador do painel de Indicadores (mig 235). Mora AQUI, e não no
          canvas, porque o canvas também é o construtor: montado lá, o líder
          inflaria o próprio painel a cada tarde de edição. Sendo o ponto comum
          das duas páginas públicas (`/c/<slug>` e o domínio próprio), nenhuma
          delas pode esquecer dele. */}
      <SiteAnalytics communityId={communityId} bookingHref={bookingHref} />
      <SiteCanvas
        config={config}
        editing={false}
        services={services}
        providerHref={providerHref}
        bookingHref={bookingHref}
        pageBase={pageBase}
        homeHref={homeHref}
        // O menu da barra lista as sub-páginas, e elas moram no documento. Sem
        // isto a página criada no construtor ficaria sem porta: ninguém a
        // alcançaria a não ser colando a URL.
        pages={config.pages || []}
        // Esta é a home, então nenhuma sub-página está aberta.
        activePageSlug={null}
        communityId={communityId}
        locale={locale}
        // Em leitura nada muda o documento. As duas funções existem só para
        // satisfazer o contrato do canvas; recebê-las como no-op é mais honesto
        // do que tornar as props opcionais e espalhar `?.` pelo componente.
        onChange={() => {}}
        onUpload={async () => null}
        t={t}
      />
    </>
  )
}
