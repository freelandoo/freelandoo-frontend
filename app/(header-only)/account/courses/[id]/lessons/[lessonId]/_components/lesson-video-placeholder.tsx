"use client"

import {
  Video,
  VideoOff,
  Loader2,
  AlertTriangle,
  CircleCheck,
  UploadCloud,
} from "lucide-react"
import type { VideoStatus } from "@/hooks/use-module-lessons"

interface Props {
  videoStatus: VideoStatus
  thumbnailUrl: string | null
}

export function LessonVideoPlaceholder({ videoStatus, thumbnailUrl }: Props) {
  let icon: React.ReactNode
  let title: string
  let subtitle: string

  if (videoStatus === "ready") {
    icon = <CircleCheck className="h-9 w-9 text-emerald-300" />
    title = "Vídeo pronto"
    subtitle = "Player do criador chega no Slice 7. Aluno assiste no Slice 14."
  } else if (videoStatus === "processing") {
    icon = <Loader2 className="h-9 w-9 animate-spin text-sky-300" />
    title = "Processando vídeo..."
    subtitle = "O Slice 8 cuida de comprimir e padronizar em 4:5."
  } else if (videoStatus === "uploading") {
    icon = <UploadCloud className="h-9 w-9 text-sky-300" />
    title = "Enviando vídeo..."
    subtitle = "Aguarde o upload terminar para continuar."
  } else if (videoStatus === "error") {
    icon = <AlertTriangle className="h-9 w-9 text-red-300" />
    title = "Erro no vídeo"
    subtitle = "Algo deu errado. Tente enviar novamente no Slice 7."
  } else {
    icon = <VideoOff className="h-9 w-9 text-white/35" />
    title = "Sem vídeo enviado"
    subtitle =
      "Upload por drag-and-drop e processamento em 4:5 chegam nos Slices 7 e 8."
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="relative aspect-video w-full bg-zinc-950/80">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt="Thumbnail da aula"
            className="h-full w-full object-cover opacity-70"
          />
        ) : null}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-transparent via-zinc-950/40 to-zinc-950/70 text-center">
          {icon}
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mx-auto max-w-md px-6 text-xs text-white/55">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
        <div className="inline-flex items-center gap-2 text-[12px] text-white/60">
          <Video className="h-3.5 w-3.5 text-primary/70" />
          Área de vídeo da aula
        </div>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Upload em breve · Slice 7
        </span>
      </div>
    </section>
  )
}
