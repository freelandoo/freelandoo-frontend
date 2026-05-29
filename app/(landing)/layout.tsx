import type { ReactNode } from "react"

/**
 * Layout do grupo (landing) — homepage editorial em tema light.
 *
 * O <html> do app é dark globalmente; a classe `.fl-root` (globals.css) força
 * color-scheme light + paleta papel/preto/dourado neste subtree. Não renderiza
 * o SiteFooter global (a landing tem o seu próprio LandingFooter), evitando
 * rodapé duplicado e mantendo controle total da composição.
 */
export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fl-root fl-paper-texture flex min-h-[100dvh] flex-col font-sans antialiased">
      {children}
    </div>
  )
}
