"use client"

import { Hexagon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function PolensShop({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hexagon className="h-5 w-5 fill-amber-300 text-amber-300" />
            Loja de Polén
          </DialogTitle>
          <DialogDescription>
            Compre pacotes de Poléns com cartão e use dentro da Freelandoo.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-amber-300/15 bg-zinc-950/40 p-6 text-center">
          <p className="text-sm text-white/70">
            Em breve. Os pacotes de Poléns estão sendo preparados pela equipe.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
