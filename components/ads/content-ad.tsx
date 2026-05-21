"use client"

import { AdSlot } from "./ad-slot"

/** ID do bloco AdSense usado nas páginas de conteúdo/institucionais. */
const SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT

/**
 * Bloco de anúncio padrão das páginas de conteúdo e institucionais
 * (colocação conservadora — fica entre o conteúdo e o rodapé).
 *
 * Não renderiza nada até `NEXT_PUBLIC_ADSENSE_SLOT_CONTENT` ser definido
 * com o ID de um bloco criado no painel do Google AdSense — assim não há
 * faixa vazia em produção enquanto o bloco não existir.
 */
export function ContentAd() {
  if (!SLOT) return null
  return (
    <div className="border-t border-border bg-background">
      <AdSlot slot={SLOT} className="container mx-auto px-4 py-6" />
    </div>
  )
}
