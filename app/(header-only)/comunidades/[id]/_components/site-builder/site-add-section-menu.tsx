"use client"

// Menu de adicionar seção. Empilhado, mesma pele do menu do "+" do headcard.

import { useEffect, useRef } from "react"
import {
  Image as ImageIcon,
  LayoutPanelTop,
  MapPin,
  MessageSquareQuote,
  ScrollText,
  Store,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { SITE_SECTION_KINDS, type SiteSectionKind } from "@/types/community-site"

const META: Record<SiteSectionKind, { icon: LucideIcon; labelKey: string; fallback: string }> = {
  hero: { icon: LayoutPanelTop, labelKey: "sectionHero", fallback: "Banner principal" },
  services_catalog: { icon: Store, labelKey: "sectionServices", fallback: "Catálogo de serviços" },
  about: { icon: ScrollText, labelKey: "sectionAbout", fallback: "Sobre nós" },
  testimonials: { icon: MessageSquareQuote, labelKey: "sectionTestimonials", fallback: "Depoimentos" },
  gallery: { icon: ImageIcon, labelKey: "sectionGallery", fallback: "Galeria de fotos" },
  contact: { icon: MapPin, labelKey: "sectionContact", fallback: "Contato e localização" },
}

/** Rótulo de uma seção — usado também pela barra de ações do canvas. */
export function sectionLabel(
  kind: SiteSectionKind,
  t: (key: string, fallback: string) => string
): string {
  const meta = META[kind]
  return t(meta.labelKey, meta.fallback)
}

export function SiteAddSectionMenu({
  onPick,
  onClose,
  t,
}: {
  onPick: (kind: SiteSectionKind) => void
  onClose: () => void
  t: (key: string, fallback: string) => string
}) {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onEsc)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      className="absolute left-0 top-full z-50 mt-2 flex w-60 flex-col border-2 border-[#0B0B0D] bg-[#15120E] p-2"
      style={{ boxShadow: "6px 6px 0 0 #0B0B0D" }}
    >
      {SITE_SECTION_KINDS.map((kind) => {
        const Icon = META[kind].icon
        return (
          <button
            key={kind}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose()
              onPick(kind)
            }}
            className="mb-1 flex w-full items-center gap-2 border-2 border-[#0B0B0D] bg-[#1D1810] px-3 py-2 text-left text-xs font-extrabold uppercase tracking-[0.1em] text-[#F5F1E8] last:mb-0 hover:bg-[#241d12]"
          >
            <Icon className="h-4 w-4 shrink-0 text-[#F2B705]" />
            {sectionLabel(kind, t)}
          </button>
        )
      })}
    </div>
  )
}
