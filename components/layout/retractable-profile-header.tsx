"use client"

import { useEffect, useState, type RefObject } from "react"
import { cn } from "@/lib/utils"

interface Props {
  /** Ref opcional pro headcard (não usado mais — mantido pra compat). */
  targetRef?: RefObject<HTMLElement | null>
  /** Nome do perfil exibido no header. */
  name: string
  /** Conteúdo extra à direita (stats, nivel, XP, etc). */
  children?: React.ReactNode
  /**
   * Progresso de XP em porcentagem (0–100). Quando definido, uma linha
   * fina amarela aparece grudada na base do header e cresce conforme
   * o XP aumenta (animada).
   */
  progress?: number
  /**
   * Dropdown ou botão "+" pra criar coisa nova. Aparece grudado atrás
   * do nome (à esquerda). Tipicamente um DropdownMenu com itens
   * (Post, Bees, Serviço, etc).
   */
  addMenu?: React.ReactNode
}

/**
 * Header transparente que segue o padrão "show on scroll up, hide on scroll
 * down":
 * - Visível ao carregar a página.
 * - Some quando o user scrolla pra baixo.
 * - Reaparece assim que o user scrolla pra cima.
 * - Sempre visível quando está no topo da página (scrollY === 0).
 *
 * Sem logo, sem botões. Só nome + slot via children + (opcional) linha de
 * progresso de XP.
 */
export function RetractableProfileHeader({ name, children, progress, addMenu }: Props) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    let lastY = typeof window === "undefined" ? 0 : window.scrollY

    const update = () => {
      const currentY = window.scrollY
      if (currentY <= 0) {
        setShow(true)
      } else if (currentY < lastY) {
        // Subindo: mostra.
        setShow(true)
      } else if (currentY > lastY) {
        // Descendo: esconde.
        setShow(false)
      }
      lastY = currentY
    }

    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  const clampedProgress =
    typeof progress === "number"
      ? Math.max(0, Math.min(100, progress))
      : null

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-30 transition-transform duration-300 ease-out",
        show ? "translate-y-0" : "-translate-y-full",
      )}
      aria-hidden={!show}
    >
      <div className="pointer-events-auto border-b-2 border-[#F5F1E8]/12 bg-[#141009]/85 backdrop-blur-xl">
        <div className="container mx-auto flex items-center gap-2 px-4 py-2.5 md:gap-3">
          {addMenu !== undefined && <div className="shrink-0">{addMenu}</div>}
          <span className="truncate text-sm font-bold text-[#F5F1E8] md:text-base">
            {name}
          </span>
          {children !== undefined && (
            <div className="ml-auto flex min-w-0 items-center gap-3 text-[11px] text-[#C9C2B6]">
              {children}
            </div>
          )}
        </div>
        {clampedProgress !== null && (
          <div className="h-[3px] w-full bg-[#F5F1E8]/10">
            <div
              className="h-full bg-[#F2B705] transition-[width] duration-700 ease-out"
              style={{ width: `${clampedProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
