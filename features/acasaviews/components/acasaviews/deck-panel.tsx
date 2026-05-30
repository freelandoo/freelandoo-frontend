import type { ReactNode } from "react"

interface DeckPanelProps {
  index: number
  total: number
  kicker: string
  title: string
  headline: string
  explanation: string
  howItWorks: string
  whyContent: string
  microcopy: string
  visual: ReactNode
  accent?: "fuchsia" | "cyan" | "violet" | "amber"
}

const ACCENT_TEXT: Record<NonNullable<DeckPanelProps["accent"]>, string> = {
  fuchsia: "text-fuchsia-300",
  cyan: "text-cyan-300",
  violet: "text-violet-300",
  amber: "text-amber-300",
}

const ACCENT_RING: Record<NonNullable<DeckPanelProps["accent"]>, string> = {
  fuchsia: "ring-fuchsia-400/15",
  cyan: "ring-cyan-400/15",
  violet: "ring-violet-400/15",
  amber: "ring-amber-400/15",
}

const ACCENT_GRADIENT: Record<NonNullable<DeckPanelProps["accent"]>, string> = {
  fuchsia: "from-fuchsia-200 via-fuchsia-300 to-rose-300",
  cyan: "from-cyan-200 via-sky-300 to-blue-300",
  violet: "from-violet-200 via-purple-300 to-fuchsia-300",
  amber: "from-amber-200 via-yellow-200 to-orange-300",
}

export function DeckPanel({
  index,
  total,
  kicker,
  title,
  headline,
  explanation,
  howItWorks,
  whyContent,
  microcopy,
  visual,
  accent = "fuchsia",
}: DeckPanelProps) {
  return (
    <div className="flex h-full w-full items-stretch px-6 py-8 md:px-12 md:py-10 lg:px-20 lg:py-12">
      <div className="grid h-full w-full grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col justify-center lg:col-span-7">
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em]">
            <span className={`font-mono tabular-nums ${ACCENT_TEXT[accent]}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="h-px w-10 bg-white/20" />
            <span className="text-slate-400">{kicker}</span>
          </div>

          <h3 className="mt-6 text-balance text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {title}
          </h3>

          <p
            className={`mt-3 max-w-2xl bg-gradient-to-r bg-clip-text text-pretty text-3xl font-semibold leading-[1.05] tracking-tight text-transparent md:text-5xl lg:text-[56px] ${ACCENT_GRADIENT[accent]}`}
          >
            {headline}
          </p>

          <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-300 md:text-[17px]">
            {explanation}
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div
              className={`rounded-xl bg-white/[0.025] p-4 ring-1 ${ACCENT_RING[accent]} backdrop-blur-xl`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Como funciona
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{howItWorks}</p>
            </div>
            <div
              className={`rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06] backdrop-blur-xl`}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500">
                Por que gera conteúdo
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{whyContent}</p>
            </div>
          </div>

          <p className={`mt-6 text-sm italic ${ACCENT_TEXT[accent]}`}>“{microcopy}”</p>
        </div>

        <div className="relative flex min-h-[280px] items-center justify-center lg:col-span-5">
          <div
            className={`relative h-full w-full overflow-hidden rounded-3xl bg-white/[0.02] ring-1 ${ACCENT_RING[accent]} backdrop-blur-xl`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(217,70,239,0.08),transparent_60%)]" />
            <div className="relative flex h-full w-full items-center justify-center p-6">
              {visual}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
