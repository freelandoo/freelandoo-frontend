"use client"

import { useEffect, useRef } from "react"

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
 * O script do AdSense é carregado uma única vez no layout raiz; aqui
 * apenas registramos o bloco na fila `adsbygoogle`.
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
