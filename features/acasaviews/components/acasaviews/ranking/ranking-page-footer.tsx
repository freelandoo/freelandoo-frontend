import Link from "next/link"
import { Bookmark, MessageCircle, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { DoodleAccent } from "./doodle-accent"

interface RankingPageFooterProps {
  tagline: string
  ctaLabel: string
  ctaHref: string
  accent: "cyan" | "magenta"
}

const ACTIONS = [
  { icon: MessageCircle, label: "COMENTE", sub: "sua opinião" },
  { icon: Send, label: "COMPARTILHE", sub: "com a galera" },
  { icon: Bookmark, label: "SALVE", sub: "pra depois" },
]

export function RankingPageFooter({ tagline, ctaLabel, ctaHref, accent }: RankingPageFooterProps) {
  const accentText = accent === "cyan" ? "text-[var(--cyan)]" : "text-[var(--magenta)]"
  const accentBg = accent === "cyan" ? "bg-[var(--cyan)] text-[var(--ink)]" : "bg-[var(--magenta)] text-white"

  return (
    <footer className="relative mt-10 bg-[var(--ink)] text-white">
      <div className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
        {/* Linha de ações estilo post */}
        <div className="grid grid-cols-3 gap-4 border-b border-white/12 pb-8">
          {ACTIONS.map((a) => {
            const Icon = a.icon
            return (
              <div key={a.label} className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5 md:h-6 md:w-6", accentText)} strokeWidth={2.4} />
                <div className="leading-none">
                  <p className={cn("casa-body text-[11px] font-extrabold uppercase tracking-[0.16em] md:text-sm", accentText)}>
                    {a.label}
                  </p>
                  <p className="mt-1 casa-body text-[10px] uppercase tracking-[0.12em] text-white/45 md:text-xs">
                    {a.sub}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Tagline + CTA */}
        <div className="mt-10 flex flex-col items-center text-center">
          <div className="relative">
            <h2 className="casa-display text-4xl leading-[0.92] md:text-7xl">{tagline}</h2>
            <DoodleAccent
              type="underline"
              className={cn("absolute -bottom-4 left-1/2 h-5 w-3/4 -translate-x-1/2", accentText)}
            />
          </div>

          <Link
            href={ctaHref}
            className={cn(
              "mt-10 inline-flex items-center gap-2 px-7 py-4 casa-body text-sm font-black uppercase tracking-[0.16em] transition-transform hover:-translate-y-1 md:text-base",
              accentBg,
            )}
          >
            {ctaLabel}
          </Link>

          <p className="mt-8 casa-body text-[12px] font-extrabold uppercase tracking-[0.3em] text-white/70">
            siga <span className={accentText}>@casaviews_</span> e entre no jogo
          </p>
        </div>
      </div>
    </footer>
  )
}
