"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  title: string
  /** Texto pequeno mostrado quando fechada. */
  summary?: React.ReactNode
  /** Ícone à esquerda do título. */
  icon?: React.ComponentType<{ className?: string }>
  /** Chave para persistir o estado em localStorage. */
  storageKey?: string
  defaultOpen?: boolean
  /** Conteúdo opcional renderizado à direita do header (botões, badges). */
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/**
 * Seção retrátil com animação GSAP de altura. Estado persistido em
 * localStorage quando `storageKey` é fornecido.
 */
export function CollapsibleSection({
  title,
  summary,
  icon: Icon,
  storageKey,
  defaultOpen = true,
  actions,
  className,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(false)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const innerRef = useRef<HTMLDivElement | null>(null)

  // Lê estado inicial do localStorage
  useEffect(() => {
    setMounted(true)
    if (!storageKey || typeof window === "undefined") return
    const stored = window.localStorage.getItem(storageKey)
    if (stored === "1") setOpen(true)
    else if (stored === "0") setOpen(false)
  }, [storageKey])

  // Persiste mudanças
  useEffect(() => {
    if (!mounted || !storageKey || typeof window === "undefined") return
    window.localStorage.setItem(storageKey, open ? "1" : "0")
  }, [open, storageKey, mounted])

  // Anima altura com GSAP
  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    ;(async () => {
      const { gsap } = await import("gsap")
      if (cancelled || !contentRef.current || !innerRef.current) return
      const target = innerRef.current.scrollHeight
      if (open) {
        gsap.to(contentRef.current, {
          height: target,
          opacity: 1,
          duration: 0.4,
          ease: "power3.out",
          onComplete: () => {
            if (contentRef.current) contentRef.current.style.height = "auto"
          },
        })
      } else {
        // garante height fixa antes de animar
        if (contentRef.current.style.height === "auto") {
          contentRef.current.style.height = `${target}px`
        }
        gsap.to(contentRef.current, {
          height: 0,
          opacity: 0,
          duration: 0.32,
          ease: "power3.in",
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, mounted])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-white/[0.02] md:px-7 md:py-5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {Icon && (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/[0.08] text-primary">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-white md:text-lg">{title}</h2>
            {summary && (
              <p className="mt-0.5 truncate text-xs text-white/50">{summary}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-white/45 transition-transform duration-300",
            open && "rotate-180 text-white/70",
          )}
        />
      </button>
      <div
        ref={contentRef}
        style={{
          height: defaultOpen && !mounted ? "auto" : open ? "auto" : 0,
          opacity: defaultOpen && !mounted ? 1 : open ? 1 : 0,
          overflow: "hidden",
        }}
      >
        <div ref={innerRef} className="border-t border-white/[0.05] px-5 py-5 md:px-7 md:py-6">
          {children}
        </div>
      </div>
    </article>
  )
}

export default CollapsibleSection
