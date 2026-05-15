"use client"

import { useState } from "react"
import { ImageIcon } from "lucide-react"

type Media = {
  id_portfolio_media: string
  media_url: string
  media_type: "image" | "video"
  is_active?: boolean
}

type Item = {
  id_portfolio_item: string
  title: string | null
  description: string | null
  project_url: string | null
  feed_kind?: "feed" | "bees"
  media: Media[]
}

export function UserAccountPortfolioTabs({ items }: { items: Item[] }) {
  const [tab, setTab] = useState<"feed" | "bees">("feed")
  const filtered = items.filter((it) => (it.feed_kind ?? "feed") === tab)
  const aspectClass = tab === "bees" ? "aspect-[9/16]" : "aspect-[4/5]"
  const emptyLabel = tab === "bees" ? "Sem Bees ainda." : "Sem itens no portfolio."

  return (
    <section className="mb-16">
      <div className="mb-8 flex items-center justify-center md:justify-start">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setTab("feed")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              tab === "feed"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => setTab("bees")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              tab === "bees"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span aria-hidden>🐝</span>
            Bees
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-muted-foreground">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2">
            <ImageIcon className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-sm font-medium">{emptyLabel}</p>
        </div>
      ) : (
        <div className="-mx-4 grid grid-cols-3 gap-px md:mx-0">
          {filtered.map((item) => {
            const activeMedias =
              item.media?.filter((media) => media.is_active !== false) ?? []
            const firstMedia = activeMedias[0]
            return (
              <div key={item.id_portfolio_item} className="group relative flex flex-col">
                {firstMedia ? (
                  <div className={`relative ${aspectClass} overflow-hidden bg-muted`}>
                    {firstMedia.media_type === "video" ? (
                      <video
                        src={firstMedia.media_url}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={firstMedia.media_url}
                        alt={item.title ?? "Midia do portfolio"}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}
                    {activeMedias.length > 1 && (
                      <div className="absolute right-3 top-3">
                        <ImageIcon className="h-5 w-5 text-white opacity-90 drop-shadow-md" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`relative flex ${aspectClass} items-center justify-center bg-muted`}>
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                <div className="px-2 pt-3 md:px-0">
                  <h3 className="line-clamp-1 text-sm font-semibold">
                    {item.title || "Sem titulo"}
                  </h3>
                  {item.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
