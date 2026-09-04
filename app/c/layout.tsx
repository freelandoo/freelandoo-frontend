// app/c/layout.tsx — o site público da comunidade não usa o chrome da Freelandoo.
//
// Esta subárvore é servida sob TRÊS endereços diferentes (`/c/<slug>`, o
// subdomínio e o domínio próprio, os dois últimos por reescrita no `proxy.ts`),
// e nos três ela tem que parecer o site do dono, não uma página dentro do nosso
// produto. É a página que declara isso — e não o endereço — porque a reescrita
// não muda a URL do navegador e um gate por host/pathname erraria justamente
// nos dois endereços independentes.
//
// Fica no `layout` e não na `page` de propósito: assim vale também para os
// estados de carregamento, erro e "não encontrado" da rota.

import { SuppressPlatformChrome } from "@/components/layout/platform-chrome"

export default function CommunitySiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <SuppressPlatformChrome />
      {children}
    </>
  )
}
