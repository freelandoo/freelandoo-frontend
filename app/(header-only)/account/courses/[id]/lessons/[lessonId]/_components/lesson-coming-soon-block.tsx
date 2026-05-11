"use client"

import { Sparkles } from "lucide-react"

interface Props {
  title: string
  description: string
  slice: string
}

export function LessonComingSoonBlock({ title, description, slice }: Props) {
  return (
    <section className="rounded-[2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 md:p-7">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-white/55">{description}</p>
          <span className="mt-2 inline-flex items-center rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
            Em breve · {slice}
          </span>
        </div>
      </div>
    </section>
  )
}
