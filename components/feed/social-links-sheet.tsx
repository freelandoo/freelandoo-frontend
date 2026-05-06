"use client"

import { ExternalLink, Link2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { FeedSocialLink } from "@/lib/types/portfolio-feed"

interface SocialLinksSheetProps {
  links: FeedSocialLink[]
  trigger: React.ReactNode
  onLinkClick?: (link: FeedSocialLink) => void
}

export function SocialLinksSheet({ links, trigger, onLinkClick }: SocialLinksSheetProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm gap-0 border-white/10 bg-zinc-950 p-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-white">Redes sociais</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto px-2 pb-3">
          {links.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-white/50">
              Sem redes cadastradas.
            </p>
          )}
          {links.map((link) => (
            <a
              key={link.social_id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => onLinkClick?.(link)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              <Link2 className="h-4 w-4 shrink-0 text-white/40" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">{link.type}</div>
                <div className="truncate text-xs text-white/50">{link.url}</div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-white/40" />
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
