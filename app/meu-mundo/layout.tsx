// app/meu-mundo/layout.tsx — o Meu Mundo 3D ocupa a tela inteira.
//
// Sem o chrome da plataforma (dock, gate de CPF, cookies, PWA): ele ficaria
// por cima dos controles do jogo. A saída é o botão "Voltar ao perfil" da
// própria tela. `viewportFit: cover` libera as áreas seguras (env(safe-area-*))
// que a interface respeita no celular.

import type { Metadata, Viewport } from "next"
import { SuppressPlatformChrome } from "@/components/layout/platform-chrome"

export const metadata: Metadata = {
  title: "Meu Mundo",
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#A8D4F2",
}

export default function MeuMundoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SuppressPlatformChrome />
      {children}
    </>
  )
}
