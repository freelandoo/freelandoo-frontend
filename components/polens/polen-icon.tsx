import { Hexagon } from "lucide-react"

export function PolenIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span className="relative inline-grid place-items-center">
      <Hexagon className={className} fill="currentColor" />
      <span className="absolute text-[9px] font-black text-zinc-950">P</span>
    </span>
  )
}
