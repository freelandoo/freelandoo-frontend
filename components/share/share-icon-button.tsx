"use client"

import { useState } from "react"
import { Send, Check } from "lucide-react"
import { toast } from "sonner"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"

interface Props {
  /** Caminho ou URL absoluta do conteúdo a compartilhar. */
  path: string
  title?: string
  description?: string
  className?: string
  ariaLabel?: string
  onShared?: () => void
}

/**
 * Botão de share só com ícone (aviãozinho). Dispara o sheet nativo do
 * browser com a URL já contendo `?cupom=<code>` do user logado (quando
 * houver). Fallback pra clipboard se navigator.share não existir.
 */
export function ShareIconButton({
  path,
  title = "Confira no Freelandoo",
  description,
  className,
  ariaLabel = "Compartilhar",
  onShared,
}: Props) {
  const { coupon } = useShareCoupon()
  const [copied, setCopied] = useState(false)

  const handleClick = async () => {
    if (typeof window === "undefined") return
    const origin = window.location.origin
    const base = path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`
    const url = coupon?.code ? buildShareUrlWithCoupon(base, coupon.code) : base

    let shared = false
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, text: description, url })
        shared = true
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast.success("Link copiado!", {
          description: coupon?.code ? `Cupom ${coupon.code} embutido.` : undefined,
        })
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        shared = true
      }
    } catch {
      /* user cancelou — sem trackeio */
    }
    if (shared) onShared?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      className={
        className ||
        "inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground active:scale-90"
      }
    >
      {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Send className="h-4 w-4" />}
    </button>
  )
}
