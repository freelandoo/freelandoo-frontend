"use client"

import { useEffect, useRef } from "react"
import Script from "next/script"

/** Publisher ID do Google AdSense da Freelandoo. */
const AD_CLIENT = "ca-pub-5728915466446266"

interface AdSlotProps {
  /**
   * ID do bloco de anúncio criado no painel do Google AdSense.
   * Quando vazio, o componente não renderiza nada — evita <ins> vazio
   * em produção enquanto os blocos ainda não foram criados.
   */
  slot?: string
  /** Formato do anúncio AdSense (auto, horizontal, rectangle, etc.). */
  format?: string
  /** Responsivo de largura total. */
  responsive?: boolean
  className?: string
}

/**
 * Bloco de anúncio do Google AdSense.
 *
 * Colocação conservadora: usar apenas em páginas de conteúdo e
 * institucionais. Não usar em áreas logadas, checkout ou admin.
 *
 * O bloco carrega o PRÓPRIO script do AdSense (o `id` faz o next/script
 * deduplicar entre vários blocos na mesma página). Antes ele vinha do layout
 * raiz, o que trazia dois problemas: o script de rastreamento de terceiro
 * carregava em TODA rota — inclusive no site publicado de uma comunidade, sob o
 * domínio de um dono que não pediu anúncio nenhum — e o anúncio dependia de uma
 * peça de layout distante para funcionar. Carregando aqui, ele existe
 * exatamente onde há `<ins>` para preencher, e em lugar nenhum além disso.
 *
 * Ordem não importa: o `push` abaixo cria a fila `adsbygoogle` se ela ainda não
 * existir, e o script a consome quando chega.
 */
export function AdSlot({ slot, format = "auto", responsive = true, className }: AdSlotProps) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current || !slot) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      /* AdSense ainda não carregou ou foi bloqueado por ad-blocker */
    }
  }, [slot])

  if (!slot) return null

  return (
    <aside className={className} aria-label="Publicidade">
      {/* lazyOnload: o script de anúncios é pesado e não pode disputar o
          caminho crítico de render (LCP/TBT) com o conteúdo da página. */}
      <Script
        id="adsbygoogle-lib"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`}
        strategy="lazyOnload"
        crossOrigin="anonymous"
      />
      <span className="mb-1 block text-center text-[11px] uppercase tracking-wide text-muted-foreground/60">
        Publicidade
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </aside>
  )
}
