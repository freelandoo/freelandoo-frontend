import Image from "next/image"
import Link from "next/link"
import { CV_ASSETS } from "./cv-assets"
import { cn } from "@/lib/utils"

/**
 * Sticker da marca Casa Views (ticket asset) "colado" no canto da capa, com
 * fita washi e leve inclinação. Por padrão leva aos rankings internos. É só
 * marca — não substitui o nome do usuário.
 */
export function CasaViewsSticker({
  href = "/acasaviews/rankings",
  width = 132,
  className,
}: {
  href?: string
  width?: number
  className?: string
}) {
  const a = CV_ASSETS.ticket
  const height = Math.round((a.height / a.width) * width)
  return (
    <Link
      href={href}
      aria-label="Ver os rankings da Casa Views"
      title="Rankings da Casa Views"
      className={cn(
        "group relative block -rotate-3 transition-transform duration-200 hover:-translate-y-0.5 hover:rotate-0",
        className,
      )}
    >
      {/* fita washi colada no topo */}
      <span
        aria-hidden
        className="absolute -top-2 left-1/2 z-10 h-3.5 w-12 -translate-x-1/2 rotate-2 bg-[#E6BE4A]/70 shadow-[1px_2px_3px_rgba(0,0,0,0.35)]"
      />
      <Image
        src={a.src}
        alt={a.alt}
        width={width}
        height={height}
        priority
        draggable={false}
        className="select-none drop-shadow-[3px_4px_6px_rgba(0,0,0,0.45)] transition-[filter] group-hover:drop-shadow-[4px_6px_10px_rgba(216,169,40,0.45)]"
      />
    </Link>
  )
}
