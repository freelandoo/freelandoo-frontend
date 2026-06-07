import Image from "next/image"
import { CV_ASSETS } from "./cv-assets"
import { cn } from "@/lib/utils"

/**
 * Tira de papel rasgado real (PNG → webp) que cobre a emenda entre a capa
 * escura e o corpo creme do card. Atravessa toda a largura. Decorativo:
 * aria-hidden + pointer-events-none. Posicione com `className` (ex.: absolute
 * bottom-0). `variant` escolhe a borda irregular (01 = base, 02 = topo).
 */
export function TornPaperDivider({
  variant = "01",
  className,
}: {
  variant?: "01" | "02"
  className?: string
}) {
  const a = variant === "02" ? CV_ASSETS.tornEdge02 : CV_ASSETS.tornEdge01
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-x-0 z-20", className)}>
      <Image
        src={a.src}
        alt=""
        width={a.width}
        height={a.height}
        draggable={false}
        className="h-full w-full select-none object-fill"
      />
    </div>
  )
}
