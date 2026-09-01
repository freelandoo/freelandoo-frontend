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

import { useTranslations } from "@/components/i18n/I18nProvider"
import { SiteCanvas } from "@/app/(header-only)/comunidades/[id]/_components/site-builder/site-canvas"
import type { CommunitySiteConfig } from "@/types/community-site"

export function PublicSiteView({ config }: { config: CommunitySiteConfig }) {
  const t = useTranslations("CommunitySite")

  return (
    <SiteCanvas
      config={config}
      editing={false}
      // Em leitura nada muda o documento. As duas funções existem só para
      // satisfazer o contrato do canvas; recebê-las como no-op é mais honesto
      // do que tornar as props opcionais e espalhar `?.` pelo componente.
      onChange={() => {}}
      onUpload={async () => null}
      t={t}
    />
  )
}
