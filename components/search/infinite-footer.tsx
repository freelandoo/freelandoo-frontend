"use client"

// Rodapé das grades da vitrine: é o sentinela do scroll infinito (o ref vai
// nele) e, de quebra, mostra o spinner da próxima página ou o aviso de fim.

import { forwardRef } from "react"
import { Loader2 } from "lucide-react"
import { useTranslations } from "@/components/i18n/I18nProvider"

interface Props {
  /** Carregando a próxima página. */
  loading: boolean
  hasMore: boolean
  /** Lista vazia — o estado vazio já fala por si, não anunciar "fim". */
  empty?: boolean
}

export const InfiniteFooter = forwardRef<HTMLDivElement, Props>(
  function InfiniteFooter({ loading, hasMore, empty = false }, ref) {
    const t = useTranslations("Search")
    return (
      <div
        ref={ref}
        aria-live="polite"
        className="flex h-16 w-full items-center justify-center pb-6"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-white/50" />
            <span className="sr-only">{t("loadingMore", "Carregando mais")}</span>
          </>
        ) : !hasMore && !empty ? (
          <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/30">
            {t("endOfList", "Você chegou ao fim")}
          </span>
        ) : null}
      </div>
    )
  }
)
