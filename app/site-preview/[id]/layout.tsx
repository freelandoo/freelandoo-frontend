// app/site-preview/[id]/layout.tsx — a pré-visualização do site GERENCIADO.
//
// Mesma razão do `app/c/layout.tsx`: aqui dentro tem que parecer o site do
// dono, e não uma página dentro do nosso produto. Sem isto, a dock do perfil, o
// banner de cookies e o prompt de instalar o app apareceriam POR CIMA do site
// do cliente dentro do construtor — e o líder julgaria o site dele olhando para
// a nossa interface.
//
// Fica no `layout` e não na `page` de propósito: assim vale também para os
// estados de carregamento e de erro da rota.

import { SuppressPlatformChrome } from "@/components/layout/platform-chrome"

export default function SitePreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SuppressPlatformChrome />
      {children}
    </>
  )
}
