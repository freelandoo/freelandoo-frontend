import Image from "next/image"
import { CV_ASSETS, type CvDoodle } from "./cv-assets"
import { cn } from "@/lib/utils"

/**
 * Elemento gráfico decorativo da identidade Casa Views (coroa, seta, grifo…).
 * Puramente estético: aria-hidden, não recebe foco, não interfere no layout
 * (use posicionamento absoluto via className). next/image otimiza o webp.
 */
export function DoodleAsset({
  name,
  width,
  className,
  priority = false,
}: {
  name: CvDoodle
  /** Largura renderizada (px). Altura mantém o aspect ratio do asset. */
  width: number
  className?: string
  priority?: boolean
}) {
  const a = CV_ASSETS[name]
  const height = Math.round((a.height / a.width) * width)
  return (
    <Image
      src={a.src}
      alt=""
      aria-hidden
      width={width}
      height={height}
      priority={priority}
      draggable={false}
      className={cn("pointer-events-none select-none", className)}
    />
  )
}
