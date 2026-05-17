"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef, useState } from "react"
import { Smile } from "lucide-react"
import { cn } from "@/lib/utils"

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  { ssr: false }
)

interface EmojiPickerButtonProps {
  onPick: (emoji: string) => void
  className?: string
  /**
   * Posição do painel em relação ao botão:
   * - "top-left" (default): abre acima e ALINHADO à esquerda do botão
   *   (painel se expande pra direita). Usado quando o botão fica no canto
   *   esquerdo do composer e a esquerda do botão é a sidebar/borda.
   * - "top-right": abre acima e ALINHADO à direita do botão (painel se
   *   expande pra esquerda). Usar quando o botão fica no canto direito.
   * - "top-center": centralizado acima do botão.
   */
  align?: "top-left" | "top-right" | "top-center"
}

export function EmojiPickerButton({ onPick, className, align = "top-left" }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const check = () => setIsMobile(window.matchMedia("(max-width: 640px)").matches)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

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

  const pickerWidth = isMobile
    ? Math.min(typeof window !== "undefined" ? window.innerWidth - 24 : 320, 360)
    : 320
  const pickerHeight = isMobile ? 320 : 380

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Inserir emoji"
        aria-expanded={open}
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/65 transition-colors hover:bg-white/[0.08] hover:text-yellow-300",
          open && "border-yellow-400/40 bg-yellow-400/10 text-yellow-300",
          className
        )}
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && (
        <>
          {isMobile && (
            <button
              type="button"
              aria-hidden
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
          )}
          <div
            className={cn(
              "absolute z-[70] mb-2",
              isMobile
                ? "bottom-full left-1/2 -translate-x-1/2 origin-bottom"
                : align === "top-center"
                  ? "bottom-full left-1/2 -translate-x-1/2 origin-bottom"
                  : align === "top-right"
                    ? "bottom-full right-0 origin-bottom-right"
                    : "bottom-full left-0 origin-bottom-left"
            )}
          >
            <EmojiPicker
              onEmojiClick={(data) => {
                onPick(data.emoji)
                setOpen(false)
              }}
              theme={"dark" as never}
              searchPlaceholder="Buscar emoji"
              width={pickerWidth}
              height={pickerHeight}
              previewConfig={{ showPreview: false }}
              lazyLoadEmojis
              skinTonesDisabled
            />
          </div>
        </>
      )}
    </div>
  )
}
