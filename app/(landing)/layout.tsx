import type { ReactNode } from "react"
import { AudienceChooserModal } from "@/components/home/landing/AudienceChooserModal"
import { SiteAssetsProvider } from "@/components/site-assets/SiteAssetsProvider"

/**
 * Layout do grupo (landing) — homepage editorial em tema light.
 *
 * O <html> do app é dark globalmente; a classe `.fl-root` (globals.css) força
 * color-scheme light + paleta papel/preto/dourado neste subtree. Não renderiza
 * o SiteFooter global (a landing tem o seu próprio LandingFooter), evitando
 * rodapé duplicado e mantendo controle total da composição.
 *
 * O AudienceChooserModal (wedge comprador × vendedor) é montado aqui pra cobrir
 * `/` e `/ganhar`; é não-bloqueante (monta pós-hidratação, só na 1ª visita).
 */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] flex-col font-sans antialiased">
      <SiteAssetsProvider>
        {children}
        <AudienceChooserModal />
      </SiteAssetsProvider>
    </div>
  )
}
