import type { ReactNode } from "react"
import { SiteAssetsProvider } from "@/components/site-assets/SiteAssetsProvider"

/**
 * Layout do grupo (landing) — homepage editorial em tema light.
 *
 * O <html> do app é dark globalmente; a classe `.fl-root` (globals.css) força
 * color-scheme light + paleta papel/preto/dourado neste subtree. Não renderiza
 * o SiteFooter global (a landing tem o seu próprio LandingFooter), evitando
 * rodapé duplicado e mantendo controle total da composição.
 *
 * O wedge comprador × vendedor está PAUSADO: a `/` é a home do vendedor e a home
 * do comprador está órfã em `/comprar`. O AudienceChooserModal não é montado por
 * enquanto (arquivo mantido pra retomar depois).
 */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] flex-col font-sans antialiased">
      <SiteAssetsProvider>{children}</SiteAssetsProvider>
    </div>
  )
}
