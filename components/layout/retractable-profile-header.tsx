"use client"

import { useEffect, useState, type RefObject } from "react"
import { cn } from "@/lib/utils"

interface Props {
  /** Quando esse elemento sai da viewport, o header aparece. */
  targetRef: RefObject<HTMLElement | null>
  /** Nome do perfil exibido no header. */
  name: string
  /** Conteúdo extra à direita (stats, barra de nível, etc). */
  children?: React.ReactNode
}

/**
 * Header transparente que aparece quando o headcard rola pra cima da viewport
 * e some quando o headcard volta a aparecer. Sem logo, sem botões — só nome
 * + conteúdo passado via children.
 */
export function RetractableProfileHeader({ targetRef, name, children }: Props) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const node = targetRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0, rootMargin: "0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [targetRef])

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-30 transition-transform duration-200 ease-out",
        show ? "translate-y-0" : "-translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="pointer-events-auto border-b border-white/[0.06] bg-zinc-950/45 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-3 px-4 py-2.5 md:gap-4">
          <span className="truncate text-sm font-semibold text-white md:text-base">
            {name}
          </span>
          {children !== undefined && (
            <div className="ml-auto flex min-w-0 items-center gap-3 text-[11px] text-white/85">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
