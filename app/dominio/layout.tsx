// app/dominio/layout.tsx — mesma regra do `app/c/layout.tsx`.
//
// Esta rota é o destino da reescrita do domínio próprio (`padariadoze.com.br` →
// `/dominio/padariadoze.com.br`). Ela renderiza o mesmo site, então desliga o
// mesmo chrome: quem chega por um domínio que não é nosso é a pessoa que menos
// deveria ver a dock da Freelandoo por cima do conteúdo.

import { SuppressPlatformChrome } from "@/components/layout/platform-chrome"

export default function CommunityDomainLayout({
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
