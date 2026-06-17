"use client"

import { createElement, type ElementType } from "react"
import { renderMarkedText } from "@/lib/marked-text"
import { useSiteTexts } from "./SiteTextsProvider"
import { useTranslations } from "@/components/i18n/I18nProvider"
import { cn } from "@/lib/utils"

/**
 * Texto editável pelo admin. Renderiza o conteúdo salvo (ou o `fallback` atual),
 * sempre passando por renderMarkedText (*destaque* -> amarelo). Quando o admin liga
 * o "Editar textos" (editMode no provider), o elemento ganha contorno tracejado e,
 * ao clicar, abre o modal de edição do provider.
 *
 * i18n (F6.i18n Onda 7): o fallback é resolvido por locale via t("Home", slot,
 * fallback) — cada slot vira locale-aware sem mexer nas call-sites. Precedência:
 * override do admin (texts[slot]) > tradução do dicionário (Home[slot]) > fallback
 * pt inline. Ou seja, texto custom de admin NÃO é traduzido (é tratado como
 * conteúdo, igual nomes custom de taxonomia).
 */
export function EditableText({
  slot,
  fallback,
  as = "span",
  className,
  mark = true,
  ns = "Home",
}: {
  slot: string
  fallback: string
  as?: ElementType
  className?: string
  mark?: boolean
  /** Namespace i18n do fallback. Default "Home" (home). Tour usa "Tour". */
  ns?: string
}) {
  const { texts, admin, editMode, requestEdit } = useSiteTexts()
  const t = useTranslations(ns)
  const value = texts[slot] ?? t(slot, fallback)
  const content = renderMarkedText(value, mark)

  if (!admin || !editMode) {
    return createElement(as, { className }, content)
  }

  return createElement(
    as,
    {
      className: cn(
        "cursor-pointer rounded outline-dashed outline-2 outline-offset-2 outline-[#E0A500] transition hover:bg-[#F2B705]/15",
        className,
      ),
      title: "Clique para editar (admin)",
      role: "button",
      tabIndex: 0,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        requestEdit(slot, value)
      },
    },
    content,
  )
}
