"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { FeedMedia } from "@/lib/types/portfolio-feed"
import { cn } from "@/lib/utils"

interface PostMediaProps {
  media: FeedMedia[]
  glow?: string | null
  /** Preenche altura disponível (ex.: feed estilo TikTok) em vez de proporção 4:5 fixa */
  fillContainer?: boolean
}

export function PostMedia({ media, glow, fillContainer }: PostMediaProps) {
  const [index, setIndex] = useState(0)
  if (!media || media.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-white/[0.03] text-xs text-white/30",
          fillContainer ? "min-h-0 flex-1 w-full" : "aspect-[4/5] w-full"
        )}
      >
        sem mídia
      </div>
    )
  }

  const current = media[Math.min(index, media.length - 1)]
  const total = media.length

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-black",
        fillContainer ? "min-h-0 flex-1" : "aspect-[4/5]"
      )}
    >
      {current.type === "video" ? (
        <video
          key={current.url}
          src={current.url}
          poster={current.thumbnail_url || undefined}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={current.url}
          src={current.url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-300"
        />
      )}

      {/* Subtle inner glow tint by machine */}
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: `inset 0 0 80px ${glow}` }}
        />
      )}

      {/* Bottom legibility gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent"
      />

      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Mídia anterior"
            onClick={() => setIndex((i) => (i - 1 + total) % total)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white/85 backdrop-blur transition hover:bg-black/75 hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Próxima mídia"
            onClick={() => setIndex((i) => (i + 1) % total)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-1.5 text-white/85 backdrop-blur transition hover:bg-black/75 hover:text-white active:scale-95"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {media.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/40"
                )}
              />
            ))}
          </div>

          <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur">
            {index + 1}/{total}
          </div>
        </>
      )}
    </div>
  )
}
