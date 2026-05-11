"use client"

import { Sparkles } from "lucide-react"

interface Props {
  label: string
  slice: string
}

export function ComingSoonSection({ label, slice }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-10 text-center">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <p className="text-sm font-semibold text-white/85">
        {label} — em breve
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
        Esta seção será habilitada no <strong>{slice}</strong>. Toda a gestão
        do curso vai acontecer aqui, dentro da engrenagem.
      </p>
    </div>
  )
}
