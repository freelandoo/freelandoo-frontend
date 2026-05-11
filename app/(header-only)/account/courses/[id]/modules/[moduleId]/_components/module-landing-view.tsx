"use client"

import Link from "next/link"
import { ArrowLeft, Construction } from "lucide-react"

interface Props {
  courseId: string
  moduleId: string
}

/**
 * Stub temporário — landing visual do módulo entra completa no Slice 3.
 * Mantém uma página utilizável para o redirect após criar módulo
 * (modal "Novo módulo" da landing do curso).
 */
export function ModuleLandingView({ courseId, moduleId }: Props) {
  return (
    <main className="min-h-[100dvh] bg-zinc-950 px-4 py-10 text-white md:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <Link
          href={`/account/courses/${encodeURIComponent(courseId)}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] font-medium text-white/85 transition hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao curso
        </Link>

        <div className="mt-8 rounded-[1.5rem] border border-dashed border-primary/25 bg-[radial-gradient(circle_at_top,rgba(230,184,0,0.1),transparent_36%),rgba(255,255,255,0.018)] p-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <Construction className="h-7 w-7 text-primary" />
          </div>
          <p className="text-sm font-semibold text-white/85">
            Módulo criado com sucesso
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-white/55">
            A página visual do módulo (banner, progresso, cards de aula e botão
            +&nbsp;Aula) entra no próximo slice. ID do módulo:{" "}
            <span className="font-mono text-white/75">{moduleId}</span>.
          </p>
        </div>
      </div>
    </main>
  )
}
