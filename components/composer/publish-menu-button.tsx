"use client"

// Botão ÚNICO de publicar das superfícies de comunidade (comunidade comum,
// condomínio, bairro e mural da academia): um quadrado amarelo com "+" que
// mora NO HEADCARD — não é mais uma barra "Poste ou escreva aqui" no meio do
// feed. Apertar abre os tipos EMPILHADOS, um em cima do outro.
//
// O componente não conhece composer nenhum: quem monta decide quais tipos
// existem naquela superfície (a academia não tem Bee, por exemplo) e o que
// cada um abre.

import { useEffect, useRef, useState } from "react"
import { Film, Hexagon, ImagePlus, MessageSquare, Plus } from "lucide-react"

/** `bee` = Curto (vídeo do feed) e `story` = Bee — nomes físicos do Bees v2. */
export type PublishKind = "post" | "bee" | "story" | "recado"

export type PublishItem = { kind: PublishKind; label: string }

const ICON: Record<PublishKind, typeof Plus> = {
  post: ImagePlus,
  bee: Film,
  story: Hexagon,
  recado: MessageSquare,
}

export function PublishMenuButton({
  items,
  onPick,
  accent = "#F2B705",
  label,
  hint,
  blockedMessage,
  canPost = true,
  onBlocked,
  align = "left",
}: {
  items: PublishItem[]
  onPick: (kind: PublishKind) => void
  accent?: string
  /** aria-label/título do botão. */
  label: string
  /** Texto opcional ao lado do botão. */
  hint?: string
  /** Aviso mostrado por `onBlocked` quando o viewer ainda não pode publicar. */
  blockedMessage?: string
  canPost?: boolean
  onBlocked?: (message: string) => void
  align?: "left" | "right"
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative flex items-center gap-3">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          if (!canPost) {
            setOpen(false)
            if (blockedMessage) onBlocked?.(blockedMessage)
            return
          }
          setOpen((v) => !v)
        }}
        className="grid h-14 w-14 shrink-0 place-items-center border-2 border-[#0B0B0D] text-[#0B0B0D]"
        style={{ background: accent, boxShadow: "4px 4px 0 0 #0B0B0D" }}
      >
        <Plus className={`h-7 w-7 transition ${open ? "rotate-45" : ""}`} />
      </button>
      {hint && (
        <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#9A938A]">{hint}</span>
      )}

      {open && canPost && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-2 flex w-48 flex-col border-2 border-[#0B0B0D] bg-[#15120E] p-2 ${align === "right" ? "right-0" : "left-0"}`}
          style={{ boxShadow: "4px 4px 0 0 #0B0B0D" }}
        >
          {items.map((it) => {
            const Icon = ICON[it.kind]
            return (
              <button
                key={it.kind}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onPick(it.kind)
                }}
                className="mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] last:mb-0 hover:bg-[#241d12]"
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color: accent }} /> {it.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
