import type React from "react"
import type { Metadata } from "next"
import "./casa.css"

/**
 * Layout da seção A Casa Views, integrada ao Freelandoo sob /acasaviews.
 * Não renderiza header/footer do FL — só o wrapper `.casa-app`, que escopa a
 * paleta escura/roxa do CASA (ver casa.css). O <html>/<body> e as fontes
 * (Anton/Archivo/Caveat) vêm do layout raiz do Freelandoo.
 */
export const metadata: Metadata = {
  title: "A Casa Views",
  description:
    "A Casa Views — hub criativo de conteúdo e entretenimento: rankings ao vivo, debates, mafia e mais.",
}

export default function AcasaviewsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <div className="casa-app">{children}</div>
}
