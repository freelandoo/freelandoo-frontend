"use client"

import { Sparkles } from "lucide-react"

interface Props {
  label: string
  slice: string
}

export function ComingSoonSection({ label }: Props) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-[radial-gradient(circle_at_top,rgba(242,196,9,0.1),transparent_38%),rgba(255,255,255,0.018)] p-10 text-center">
      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/15 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <p className="text-sm font-semibold text-white/85">
        {label} ficam dentro de cada aula
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
        Abra um módulo, entre na aula desejada e gerencie este conteúdo por lá.
        Essa organização mantém o curso fácil de revisar em desktop e mobile.
      </p>
    </div>
  )
}
