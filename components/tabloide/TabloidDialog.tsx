/**
 * TabloidDialog — o modal de papel.
 *
 * Monta sobre o `Dialog` do shadcn (Radix) só pelo comportamento: foco preso,
 * ESC, portal, acessibilidade. Toda a aparência é substituída — recorte de
 * papel reto, borda de 2px, sombra dura deslocada e manchete Anton. O véu é
 * tinta quase sólida, não o cinza translúcido do shadcn.
 *
 * Este é o único lugar do redesign que pode alcançar `@/components/ui/*`:
 * o kit encapsula o primitivo para que as páginas não precisem dele.
 */
"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function TabloidDialog({
  open,
  onOpenChange,
  trigger,
  title,
  eyebrow,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Fechar",
  className,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** elemento que abre o modal; dispensável em modal controlado */
  trigger?: ReactNode
  title: ReactNode
  /** sobrancelha em versalete acima da manchete */
  eyebrow?: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: "sm" | "md" | "lg"
  closeLabel?: string
  className?: string
}) {
  const maxWidth = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl" }[size]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-0 text-[#0B0B0D] shadow-[8px_8px_0_0_#0B0B0D]",
          maxWidth,
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-[#0B0B0D] px-5 py-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#6B6457]">
                {eyebrow}
              </p>
            )}
            <DialogTitle className="fl-display text-2xl leading-none text-[#0B0B0D]">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="mt-2 text-sm font-semibold text-[#5b554b]">
                {description}
              </DialogDescription>
            )}
          </div>
          <DialogClose
            aria-label={closeLabel}
            className="shrink-0 border-2 border-[#0B0B0D] bg-[#F1EDE2] p-1 text-[#0B0B0D] transition-colors hover:bg-[#F2B705]"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        {children && <div className="px-5 py-5">{children}</div>}

        {footer && (
          <DialogFooter className="border-t-2 border-[#0B0B0D] px-5 py-4">{footer}</DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export { DialogClose as TabloidDialogClose, DialogTrigger as TabloidDialogTrigger }
