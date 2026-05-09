"use client"

import { Loader2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WatchAdButton({ disabled, loading, onClick }: { disabled?: boolean; loading?: boolean; onClick: () => void }) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className="bg-amber-300 text-zinc-950 hover:bg-amber-200"
    >
      {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
      Assistir anúncio e ganhar
    </Button>
  )
}
