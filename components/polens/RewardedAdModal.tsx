"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Play, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { createMockRewardedAdProvider } from "./rewarded-ad-provider"
import { PolenIcon } from "./polen-icon"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  rewardAmount: number
  token: string
  onComplete: (token: string) => Promise<void>
}

export function RewardedAdModal({ open, onOpenChange, rewardAmount, token, onComplete }: Props) {
  const provider = useMemo(() => createMockRewardedAdProvider(), [])
  const [state, setState] = useState<"idle" | "loading" | "watching" | "crediting" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    provider.onRewardEarned(async () => {
      setState("crediting")
      await onComplete(token)
      setState("done")
    })
    provider.onAdFailed((message) => {
      setError(message)
      setState("idle")
    })
  }, [onComplete, provider, token])

  async function handleWatch() {
    setError(null)
    setState("loading")
    await provider.loadAd()
    setState("watching")
    await provider.showAd()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-amber-300/20 bg-zinc-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PolenIcon className="h-5 w-5 text-amber-300" />
            Ganhar Poléns
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Assista a um anúncio para ganhar {rewardAmount} Poléns.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
          O anúncio é voluntário e não bloqueia o uso normal da Freelandoo.
          Poléns são créditos internos, não sacáveis e não transferíveis.
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-1 h-4 w-4" />
            Fechar
          </Button>
          <Button onClick={handleWatch} disabled={state !== "idle"} className="bg-amber-300 text-zinc-950 hover:bg-amber-200">
            {state === "idle" ? <Play className="mr-1 h-4 w-4" /> : <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {state === "idle" && "Assistir"}
            {state === "loading" && "Carregando"}
            {state === "watching" && "Assistindo"}
            {state === "crediting" && "Creditando"}
            {state === "done" && "Creditado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
