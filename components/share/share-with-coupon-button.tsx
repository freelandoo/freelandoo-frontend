"use client"

import { useMemo, useState } from "react"
import { Copy, Share2, MessageCircle, Send } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useShareCoupon, buildShareUrlWithCoupon } from "@/hooks/use-share-coupon"

interface Props {
  /** Caminho do conteúdo a compartilhar (ex: `/cursos/design-de-impacto`). Sem domínio. */
  path: string
  /** Título mostrado no modal e na share API nativa. */
  title?: string
  /** Texto descritivo no modal. */
  description?: string
  /** Variantes de aparência do botão. */
  variant?: "default" | "outline" | "ghost" | "secondary"
  /** Tamanho do botão. */
  size?: "default" | "sm" | "lg" | "icon"
  /** Label custom; default = "Compartilhar com meu cupom". */
  label?: string
  /** Se true, esconde o label e mostra só ícone. */
  iconOnly?: boolean
  className?: string
}

export function ShareWithCouponButton({
  path,
  title = "Confira no Freelandoo",
  description = "Envie este link. Quem comprar por ele ganha desconto automaticamente usando seu cupom.",
  variant = "outline",
  size = "sm",
  label = "Compartilhar com meu cupom",
  iconOnly = false,
  className,
}: Props) {
  const { coupon, isLoading } = useShareCoupon()
  const [open, setOpen] = useState(false)

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return ""
    const origin = window.location.origin
    const base = path.startsWith("http") ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`
    if (!coupon?.code) return base
    return buildShareUrlWithCoupon(base, coupon.code)
  }, [path, coupon?.code])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copiado!", { description: coupon?.code ? `Cupom ${coupon.code} embutido.` : undefined })
    } catch {
      toast.error("Não foi possível copiar.")
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return
    try {
      await navigator.share({ title, text: description, url: shareUrl })
    } catch {
      // user cancelou — ok
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`

  // Sem cupom carregado ainda: ainda assim renderiza (vai compartilhar link sem cupom).
  // Sem user logado / sem cupom: aviso suave dentro do modal.

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className} disabled={isLoading}>
          <Share2 className="h-4 w-4" />
          {!iconOnly && <span className="ml-2">{label}</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar com meu cupom</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {coupon?.code ? (
            <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              Cupom embutido: <strong className="font-mono">{coupon.code}</strong>
            </div>
          ) : (
            <div className="rounded-md border border-muted bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Você ainda não tem cupom ativo. O link será compartilhado sem desconto.
            </div>
          )}

          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
            <span className="flex-1 truncate text-xs text-muted-foreground" title={shareUrl}>
              {shareUrl || "Carregando..."}
            </span>
            <button
              onClick={handleCopy}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Copiar link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                <span className="ml-2">WhatsApp</span>
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                <Send className="h-4 w-4" />
                <span className="ml-2">Telegram</span>
              </a>
            </Button>
          </div>

          {canNativeShare && (
            <Button variant="default" size="sm" className="w-full" onClick={handleNativeShare}>
              <Share2 className="h-4 w-4" />
              <span className="ml-2">Compartilhar via app</span>
            </Button>
          )}

          <Button variant="ghost" size="sm" className="w-full" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            <span className="ml-2">Copiar link</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
