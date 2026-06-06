import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Link discreto que cruza entre as duas home (comprador `/` ↔ vendedor `/ganhar`).
 * Visual leve em tema light (fl-root), pensado pra rodapé de hero ou CTA final.
 */
export function AudienceCrossLink({
  href,
  children,
  className,
}: {
  href: string
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-bold text-[#0B0B0D]/70 underline-offset-4 transition hover:text-[#0B0B0D] hover:underline",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  )
}
