"use client"

import { useState } from "react"
import { Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useShareCoupon } from "@/hooks/use-share-coupon"
import { ShareWithCouponDialog } from "./share-with-coupon-dialog"

interface Props {
  path: string
  title?: string
  description?: string
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  label?: string
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
  const { isLoading } = useShareCoupon()
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant={variant} size={size} className={className} disabled={isLoading} onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        {!iconOnly && <span className="ml-2">{label}</span>}
      </Button>
      <ShareWithCouponDialog
        open={open}
        onOpenChange={setOpen}
        path={path}
        title={title}
        description={description}
      />
    </>
  )
}
