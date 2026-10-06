import type React from "react"
import type { Metadata } from "next"
import "./casa.css"
import "./reality.css"
import { RealityHeader } from "@/features/acasaviews/components/reality/reality-header"

/**
 * Layout da seção A Casa Views, integrada ao Freelandoo sob /acasaviews.
 * Não renderiza header/footer do FL — só o wrapper `.casa-app` (paleta do
 * CASA) com os tokens da pele "reality" (`.rv-tokens`) e o cabeçalho único da
 * seção. O <html>/<body> e as fontes (Anton/Archivo/Caveat/Geist Mono) vêm do
 * layout raiz do Freelandoo.
 */
export const metadata: Metadata = {
  title: "A Casa Views",
  description:
    "A Casa Views — o reality que acontece nas redes: rankings ao vivo, participantes e a loja oficial.",
}

export default function AcasaviewsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="casa-app rv-tokens">
      <RealityHeader />
      {children}
    </div>
  )
}
