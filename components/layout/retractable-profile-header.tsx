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

    // Mostra quando o BOTTOM do headcard passa acima do topo da viewport.
    // IntersectionObserver com threshold 0 e bottom-margin gigante:
    // o "root" vira só uma faixa fininha grudada no topo da viewport.
    // entry.isIntersecting === true → o headcard ainda toca essa faixa
    //   (parte do card ainda na viewport ou abaixo dela).
    // entry.isIntersecting === false + boundingClientRect.bottom <= 0
    //   → o card já passou inteirinho acima do topo da viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShow(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
      },
      { threshold: 0 },
    )
    observer.observe(node)

    // Fallback: força um check no scroll porque o IntersectionObserver não
    // dispara enquanto o card está totalmente acima/abaixo sem cruzar fronteira.
    const onScroll = () => {
      const rect = node.getBoundingClientRect()
      setShow(rect.bottom <= 0)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", onScroll)
    }
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
