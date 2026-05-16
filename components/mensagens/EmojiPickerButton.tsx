"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

// Carregamento dinâmico — emoji-picker-react inclui spritesheet pesada, melhor
// só carregar quando o usuário abre o picker.
const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  { ssr: false }
)

interface EmojiPickerButtonProps {
  onPick: (emoji: string) => void
  className?: string
}

/**
 * Botão de emoji integrado ao chat. Abre painel em popover acima do botão,
 * fecha ao escolher emoji ou clicar fora.
 */
export function EmojiPickerButton({ onPick, className }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Inserir emoji"
        aria-expanded={open}
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-neutral-900 text-white/70 transition hover:bg-neutral-800 hover:text-white",
          open && "text-amber-300",
          className
        )}
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && (
        <div className="absolute bottom-12 right-0 z-[60] origin-bottom-right">
          <EmojiPicker
            onEmojiClick={(data) => {
              onPick(data.emoji)
              setOpen(false)
            }}
            // emoji-picker-react aceita "dark"/"light"/"auto" como string
            // (a constante Theme.DARK exporta o mesmo valor)
            theme={"dark" as never}
            searchPlaceholder="Buscar emoji"
            width={320}
            height={380}
            previewConfig={{ showPreview: false }}
            lazyLoadEmojis
            skinTonesDisabled
          />
        </div>
      )}
    </div>
  )
}
