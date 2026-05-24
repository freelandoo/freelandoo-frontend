"use client"

import { useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Loader2, X } from "lucide-react"
import type { ChosenPath } from "./types"

// Player de vídeo em TELA INTEIRA, sem borda — comporta como uma página
// dedicada montada por cima do app. ESC ou botão X fecha.
export function IntentVideoOverlay({
  chosen,
  onClose,
}: {
  chosen: ChosenPath
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  // Bloqueia scroll do body enquanto o vídeo está aberto.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[110] flex min-h-[100dvh] flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Tutorial: ${chosen.title}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 active:scale-[0.96]"
        aria-label="Fechar tutorial"
      >
        <X className="h-5 w-5" />
      </button>

      {chosen.video_url ? (
        <video
          ref={videoRef}
          src={chosen.video_url}
          poster={chosen.poster_url || undefined}
          controls
          autoPlay
          playsInline
          className="h-full w-full object-contain"
        />
      ) : (
        <PendingVideoState title={chosen.title} />
      )}
    </motion.div>
  )
}

// Placeholder mostrado quando o admin ainda não subiu vídeo para o caminho.
function PendingVideoState({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Vídeo em produção
        </h2>
        <p className="max-w-[48ch] text-sm text-white/60">
          O tutorial de <span className="font-medium text-white/80">{title}</span> está sendo
          finalizado. Sua escolha já foi salva — você pode fechar e voltar mais tarde.
        </p>
      </div>
    </div>
  )
}
